/* eslint-disable prefer-const */
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { WidgetTypeEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { compareArrayElements, isConnectionTypeAgent } from '../../../helpers/index.js';
import { buildCreatedTableActionDS } from '../../table-actions/utils/build-created-table-action-ds.js';
import { GetRowByPrimaryKeyDs } from '../application/data-structures/get-row-by-primary-key.ds.js';
import { ForeignKeyDSInfo, ITableRowRO } from '../table.interface.js';
import { convertBinaryDataInRowUtil } from '../utils/convert-binary-data-in-row.util.js';
import { convertHexDataInPrimaryKeyUtil } from '../utils/convert-hex-data-in-primary-key.util.js';
import { formFullTableStructure } from '../utils/form-full-table-structure.js';
import { removePasswordsFromRowsUtil } from '../utils/remove-password-from-row.util.js';
import { IGetRowByPrimaryKey } from './table-use-cases.interface.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object-agent.interface.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object.interface.js';
import { ForeignKeyWithAutocompleteColumnsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key-with-autocomplete-columns.ds.js';
import { ForeignKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key.ds.js';

@Injectable()
export class GetRowByPrimaryKeyUseCase
  extends AbstractUseCase<GetRowByPrimaryKeyDs, ITableRowRO>
  implements IGetRowByPrimaryKey
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: GetRowByPrimaryKeyDs): Promise<ITableRowRO> {
    // eslint-disable-next-line prefer-const
    let { connectionId, masterPwd, primaryKey, tableName, userId } = inputData;
    if (!primaryKey) {
      throw new HttpException(
        {
          message: Messages.PRIMARY_KEY_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
    if (!connection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const dao = getDataAccessObject(connection);

    let userEmail: string;
    if (isConnectionTypeAgent(connection.type)) {
      userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
    }
    let [
      tableStructure,
      tableWidgets,
      tableSettings,
      tableForeignKeys,
      tablePrimaryKeys,
      tableActions,
      referencedTableNamesAndColumns,
    ] = await Promise.all([
      dao.getTableStructure(tableName, userEmail),
      this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName),
      this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
      dao.getTableForeignKeys(tableName, userEmail),
      dao.getTablePrimaryColumns(tableName, userEmail),
      this._dbContext.tableActionRepository.findTableActions(connectionId, tableName),
      dao.getReferencedTableNamesAndColumns(tableName, userEmail),
    ]);
    primaryKey = convertHexDataInPrimaryKeyUtil(primaryKey, tableStructure);
    const availablePrimaryColumns: Array<string> = tablePrimaryKeys.map((column) => column.column_name);
    for (const key in primaryKey) {
      // eslint-disable-next-line security/detect-object-injection
      if (!primaryKey[key] && primaryKey[key] !== '') delete primaryKey[key];
    }
    const receivedPrimaryColumns = Object.keys(primaryKey);
    if (!compareArrayElements(availablePrimaryColumns, receivedPrimaryColumns)) {
      throw new HttpException(
        {
          message: Messages.PRIMARY_KEY_INVALID,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const foreignKeysFromWidgets: Array<ForeignKeyDSInfo> = tableWidgets
      .filter((el) => {
        return el.widget_type === WidgetTypeEnum.Foreign_key;
      })
      .map((widget) => {
        return widget.widget_params as unknown as ForeignKeyDSInfo;
      });

    tableForeignKeys = tableForeignKeys.concat(foreignKeysFromWidgets);
    let foreignKeysWithAutocompleteColumns: Array<ForeignKeyWithAutocompleteColumnsDS> = [];
    if (tableForeignKeys && tableForeignKeys.length > 0) {
      foreignKeysWithAutocompleteColumns = await Promise.all(
        tableForeignKeys.map((el) => {
          try {
            return this.attachForeignColumnNames(el, userId, connectionId, dao);
          } catch (e) {
            return el as ForeignKeyWithAutocompleteColumnsDS;
          }
        }),
      );
    }
    let rowData = await dao.getRowByPrimaryKey(tableName, primaryKey, tableSettings, userEmail);
    if (!rowData) {
      throw new HttpException(
        {
          message: Messages.ROW_PRIMARY_KEY_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    rowData = removePasswordsFromRowsUtil(rowData, tableWidgets);
    rowData = convertBinaryDataInRowUtil(rowData, tableStructure);
    const formedTableStructure = formFullTableStructure(tableStructure, tableSettings);
    return {
      row: rowData,
      foreignKeys: foreignKeysWithAutocompleteColumns,
      primaryColumns: tablePrimaryKeys,
      structure: formedTableStructure,
      table_widgets: tableWidgets,
      readonly_fields: tableSettings?.readonly_fields ? tableSettings.readonly_fields : [],
      list_fields: tableSettings?.list_fields?.length > 0 ? tableSettings.list_fields : [],
      table_actions: tableActions?.length > 0 ? tableActions.map((el) => buildCreatedTableActionDS(el)) : [],
      identity_column: tableSettings?.identity_column ? tableSettings.identity_column : null,
      referenced_table_names_and_columns: referencedTableNamesAndColumns,
    };
  }

  private async attachForeignColumnNames(
    foreignKey: ForeignKeyDS,
    userId: string,
    connectionId: string,
    dao: IDataAccessObject | IDataAccessObjectAgent,
  ): Promise<ForeignKeyWithAutocompleteColumnsDS> {
    try {
      const [foreignTableSettings, foreignTableStructure] = await Promise.all([
        this._dbContext.tableSettingsRepository.findTableSettings(connectionId, foreignKey.referenced_table_name),
        dao.getTableStructure(foreignKey.referenced_table_name, userId),
      ]);

      let columnNames = foreignTableStructure.map((el) => {
        return el.column_name;
      });
      if (foreignTableSettings && foreignTableSettings.autocomplete_columns.length > 0) {
        columnNames = columnNames.filter((el) => {
          const index = foreignTableSettings.autocomplete_columns.indexOf(el);
          return index >= 0;
        });
      }
      return {
        ...foreignKey,
        autocomplete_columns: columnNames,
      };
    } catch (e) {
      return {
        ...foreignKey,
        autocomplete_columns: [],
      };
    }
  }
}
