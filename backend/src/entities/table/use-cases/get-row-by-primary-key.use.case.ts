import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { GetRowByPrimaryKeyDs } from '../application/data-structures/get-row-by-primary-key.ds';
import { IForeignKeyInfo, ITableRowRO } from '../table.interface';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { Messages } from '../../../exceptions/text/messages';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object';
import { compareArrayElements, isConnectionTypeAgent } from '../../../helpers';
import { WidgetTypeEnum } from '../../../enums';
import {
  IDataAccessObject,
  IForeignKey,
  IForeignKeyWithForeignColumnName,
} from '../../../data-access-layer/shared/data-access-object-interface';
import { removePasswordsFromRowsUtil } from '../utils/remove-password-from-row.util';
import { formFullTableStructure } from '../utils/form-full-table-structure';
import { IGetRowByPrimaryKey } from './table-use-cases.interface';
import { convertBinaryDataInRowUtil } from '../utils/convert-binary-data-in-row.util';
import { convertHexDataInPrimaryKeyUtil } from '../utils/convert-hex-data-in-primary-key.util';

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

    const dao = createDataAccessObject(connection, userId);

    let userEmail: string;
    if (isConnectionTypeAgent(connection.type)) {
      userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
    }

    // eslint-disable-next-line prefer-const
    let [tableStructure, tableWidgets, tableSettings, tableForeignKeys, tablePrimaryKeys] = await Promise.all([
      dao.getTableStructure(tableName, userEmail),
      this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName),
      this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
      dao.getTableForeignKeys(tableName, userEmail),
      dao.getTablePrimaryColumns(tableName, userEmail),
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

    const foreignKeysFromWidgets: Array<IForeignKeyInfo> = tableWidgets
      .filter((el) => {
        return el.widget_type === WidgetTypeEnum.Foreign_key;
      })
      .map((widget) => {
        return widget.widget_params as unknown as IForeignKeyInfo;
      });

    tableForeignKeys = tableForeignKeys.concat(foreignKeysFromWidgets);
    let foreignKeysWithAutocompleteColumns: Array<IForeignKeyWithForeignColumnName> = [];
    if (tableForeignKeys && tableForeignKeys.length > 0) {
      foreignKeysWithAutocompleteColumns = await Promise.all(
        tableForeignKeys.map((el) => {
          try {
            return this.attachForeignColumnNames(el, userId, connectionId, dao);
          } catch (e) {
            return el as IForeignKeyWithForeignColumnName;
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
    };
  }

  private async attachForeignColumnNames(
    foreignKey: IForeignKey,
    userId: string,
    connectionId: string,
    dao: IDataAccessObject,
  ): Promise<IForeignKeyWithForeignColumnName> {
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
