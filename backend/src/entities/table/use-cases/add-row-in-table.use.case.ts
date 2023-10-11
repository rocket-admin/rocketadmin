/* eslint-disable prefer-const */
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import {
  AmplitudeEventTypeEnum,
  LogOperationTypeEnum,
  OperationResultStatusEnum,
  WidgetTypeEnum,
} from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isConnectionTypeAgent, isObjectEmpty, toPrettyErrorsMsg } from '../../../helpers/index.js';
import { AmplitudeService } from '../../amplitude/amplitude.service.js';
import { isTestConnectionUtil } from '../../connection/utils/is-test-connection-util.js';
import { TableLogsService } from '../../table-logs/table-logs.service.js';
import { AddRowInTableDs } from '../application/data-structures/add-row-in-table.ds.js';
import { ForeignKeyDSInfo, ReferencedTableNamesAndColumnsDs, TableRowRODs } from '../table-datastructures.js';
import { convertHexDataInRowUtil } from '../utils/convert-hex-data-in-row.util.js';
import { formFullTableStructure } from '../utils/form-full-table-structure.js';
import { hashPasswordsInRowUtil } from '../utils/hash-passwords-in-row.util.js';
import { processUuidsInRowUtil } from '../utils/process-uuids-in-row-util.js';
import { removePasswordsFromRowsUtil } from '../utils/remove-password-from-row.util.js';
import { validateTableRowUtil } from '../utils/validate-table-row.util.js';
import { IAddRowInTable } from './table-use-cases.interface.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object.interface.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object-agent.interface.js';
import { ForeignKeyWithAutocompleteColumnsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key-with-autocomplete-columns.ds.js';
import { ForeignKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key.ds.js';
import { ReferencedTableNamesAndColumnsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/referenced-table-names-columns.ds.js';

@Injectable()
export class AddRowInTableUseCase extends AbstractUseCase<AddRowInTableDs, TableRowRODs> implements IAddRowInTable {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private amplitudeService: AmplitudeService,
    private tableLogsService: TableLogsService,
  ) {
    super();
  }

  protected async implementation(inputData: AddRowInTableDs): Promise<TableRowRODs> {
    // eslint-disable-next-line prefer-const
    let { connectionId, masterPwd, row, tableName, userId } = inputData;
    const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
    if (!connection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    let operationResult = OperationResultStatusEnum.unknown;

    const dao = getDataAccessObject(connection);

    let userEmail: string;
    if (isConnectionTypeAgent(connection.type)) {
      userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
    }
    const isView = await dao.isView(tableName, userEmail);
    if (isView) {
      throw new HttpException(
        {
          message: Messages.CANT_UPDATE_TABLE_VIEW,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    let [
      tableStructure,
      tableWidgets,
      tableSettings,
      tableForeignKeys,
      tablePrimaryKeys,
      referencedTableNamesAndColumns,
    ] = await Promise.all([
      dao.getTableStructure(tableName, userEmail),
      this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName),
      this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
      dao.getTableForeignKeys(tableName, userEmail),
      dao.getTablePrimaryColumns(tableName, userEmail),
      dao.getReferencedTableNamesAndColumns(tableName, userEmail),
    ]);

    const referencedTableNamesAndColumnsWithTablesDisplayNames: Array<ReferencedTableNamesAndColumnsDs> =
      await Promise.all(
        referencedTableNamesAndColumns.map(async (el: ReferencedTableNamesAndColumnsDS) => {
          const { referenced_by, referenced_on_column_name } = el;
          const responseObject: ReferencedTableNamesAndColumnsDs = {
            referenced_on_column_name: referenced_on_column_name,
            referenced_by: [],
          };
          for (const element of referenced_by) {
            const foundTableSettings = await this._dbContext.tableSettingsRepository.findTableSettings(
              connectionId,
              element.table_name,
            );
            const displayName = foundTableSettings?.display_name ? foundTableSettings.display_name : null;
            responseObject.referenced_by.push({
              ...element,
              display_name: displayName,
            });
          }
          return responseObject;
        }),
      );

    if (tableSettings && !tableSettings?.can_add) {
      throw new HttpException(
        {
          message: Messages.CANT_DO_TABLE_OPERATION,
        },
        HttpStatus.FORBIDDEN,
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

    const errors = validateTableRowUtil(row, tableStructure);
    if (errors.length > 0) {
      throw new HttpException(
        {
          message: toPrettyErrorsMsg(errors),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const formedTableStructure = formFullTableStructure(tableStructure, tableSettings);
    try {
      row = await hashPasswordsInRowUtil(row, tableWidgets);
      row = processUuidsInRowUtil(row, tableWidgets);
      row = convertHexDataInRowUtil(row, tableStructure);
      const result = (await dao.addRowInTable(tableName, row, userEmail)) as Record<string, unknown>;
      if (result && !isObjectEmpty(result)) {
        operationResult = OperationResultStatusEnum.successfully;
        let addedRow = await dao.getRowByPrimaryKey(tableName, result, tableSettings, userEmail);
        addedRow = removePasswordsFromRowsUtil(addedRow, tableWidgets);

        return {
          row: addedRow,
          foreignKeys: foreignKeysWithAutocompleteColumns,
          primaryColumns: tablePrimaryKeys,
          structure: formedTableStructure,
          table_widgets: tableWidgets,
          display_name: tableSettings?.display_name ? tableSettings.display_name : null,
          readonly_fields: tableSettings?.readonly_fields ? tableSettings.readonly_fields : [],
          list_fields: tableSettings?.list_fields?.length > 0 ? tableSettings.list_fields : [],
          identity_column: tableSettings?.identity_column ? tableSettings.identity_column : null,
          referenced_table_names_and_columns: referencedTableNamesAndColumnsWithTablesDisplayNames,
        };
      }
    } catch (e) {
      operationResult = OperationResultStatusEnum.unsuccessfully;
      throw new HttpException(
        {
          message: e.message.includes('duplicate key value')
            ? Messages.CANT_INSERT_DUPLICATE_KEY
            : `${Messages.FAILED_ADD_ROW_IN_TABLE}
         ${Messages.ERROR_MESSAGE} ${e.message} ${Messages.TRY_AGAIN_LATER}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    } finally {
      const logRecord = {
        table_name: tableName,
        userId: userId,
        connection: connection,
        operationType: LogOperationTypeEnum.addRow,
        operationStatusResult: operationResult,
        row: row,
      };
      await this.tableLogsService.crateAndSaveNewLogUtil(logRecord);
      const isTest = isTestConnectionUtil(connection);
      await this.amplitudeService.formAndSendLogRecord(
        isTest ? AmplitudeEventTypeEnum.tableRowAddedTest : AmplitudeEventTypeEnum.tableRowAdded,
        userId,
      );
    }
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
