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
import { compareArrayElements, isConnectionTypeAgent, toPrettyErrorsMsg } from '../../../helpers/index.js';
import { AmplitudeService } from '../../amplitude/amplitude.service.js';
import { isTestConnectionUtil } from '../../connection/utils/is-test-connection-util.js';
import { TableLogsService } from '../../table-logs/table-logs.service.js';
import { UpdateRowInTableDs } from '../application/data-structures/update-row-in-table.ds.js';
import { ForeignKeyDSInfo, ReferencedTableNamesAndColumnsDs, TableRowRODs } from '../table-datastructures.js';
import { formFullTableStructure } from '../utils/form-full-table-structure.js';
import { hashPasswordsInRowUtil } from '../utils/hash-passwords-in-row.util.js';
import { processUuidsInRowUtil } from '../utils/process-uuids-in-row-util.js';
import { removePasswordsFromRowsUtil } from '../utils/remove-password-from-row.util.js';
import { IUpdateRowInTable } from './table-use-cases.interface.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object-agent.interface.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object.interface.js';
import { ForeignKeyWithAutocompleteColumnsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key-with-autocomplete-columns.ds.js';
import { ForeignKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key.ds.js';
import { UnknownSQLException } from '../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { ExceptionOperations } from '../../../exceptions/custom-exceptions/exception-operation.js';
import { ReferencedTableNamesAndColumnsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/referenced-table-names-columns.ds.js';
import JSON5 from 'json5';
import { TableActionEventEnum } from '../../../enums/table-action-event-enum.js';
import { TableActionActivationService } from '../../table-actions/table-actions-module/table-action-activation.service.js';

@Injectable()
export class UpdateRowInTableUseCase
  extends AbstractUseCase<UpdateRowInTableDs, TableRowRODs>
  implements IUpdateRowInTable
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private amplitudeService: AmplitudeService,
    private tableLogsService: TableLogsService,
    private tableActionActivationService: TableActionActivationService,
  ) {
    super();
  }

  protected async implementation(inputData: UpdateRowInTableDs): Promise<TableRowRODs> {
    // eslint-disable-next-line prefer-const
    let { connectionId, masterPwd, primaryKey, row, tableName, userId } = inputData;
    let operationResult = OperationResultStatusEnum.unknown;

    const errors = [];
    if (!primaryKey) {
      errors.push(Messages.PRIMARY_KEY_MISSING);
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

    for (const referencedTable of referencedTableNamesAndColumns) {
      referencedTable.referenced_by = await Promise.all(
        referencedTable.referenced_by.map(async (referencedByTable) => {
          const canUserReadTable = await this._dbContext.userAccessRepository.checkTableRead(
            userId,
            connectionId,
            referencedByTable.table_name,
            masterPwd,
          );
          return canUserReadTable ? referencedByTable : null;
        }),
      ).then((results) => results.filter(Boolean));
    }

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

    if (tableSettings && !tableSettings?.can_update) {
      throw new HttpException(
        {
          message: Messages.CANT_DO_TABLE_OPERATION,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    if (errors.length > 0) {
      throw new HttpException(
        {
          message: toPrettyErrorsMsg(errors),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const foreignKeysFromWidgets: Array<ForeignKeyDSInfo> = tableWidgets
      .filter((widget) => widget.widget_type === WidgetTypeEnum.Foreign_key)
      .map((widget) => {
        if (widget.widget_params) {
          try {
            const widgetParams = JSON5.parse(widget.widget_params) as ForeignKeyDSInfo;
            return widgetParams;
          } catch (_e) {
            return null;
          }
        }
      })
      .filter((el) => el !== null);

    tableForeignKeys = tableForeignKeys.concat(foreignKeysFromWidgets);

    let foreignKeysWithAutocompleteColumns: Array<ForeignKeyWithAutocompleteColumnsDS> = [];
    const canUserReadForeignTables: Array<{
      tableName: string;
      canRead: boolean;
    }> = await Promise.all(
      tableForeignKeys.map(async (foreignKey) => {
        const cenTableRead = await this._dbContext.userAccessRepository.checkTableRead(
          userId,
          connectionId,
          foreignKey.referenced_table_name,
          masterPwd,
        );
        return {
          tableName: foreignKey.referenced_table_name,
          canRead: cenTableRead,
        };
      }),
    );
    tableForeignKeys = tableForeignKeys.filter((foreignKey) => {
      return canUserReadForeignTables.find((el) => {
        return el.tableName === foreignKey.referenced_table_name && el.canRead;
      });
    });

    if (tableForeignKeys && tableForeignKeys.length > 0) {
      foreignKeysWithAutocompleteColumns = await Promise.all(
        tableForeignKeys.map((el) => {
          try {
            return this.attachForeignColumnNames(el, userId, connectionId, dao);
          } catch (_e) {
            return el as ForeignKeyWithAutocompleteColumnsDS;
          }
        }),
      );
    }

    const availablePrimaryColumns = tablePrimaryKeys.map((key) => {
      return key.column_name;
    });
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

    let oldRowData: Record<string, unknown>;
    try {
      oldRowData = await dao.getRowByPrimaryKey(tableName, primaryKey, tableSettings, userEmail);
    } catch (e) {
      throw new UnknownSQLException(e.message, ExceptionOperations.FAILED_TO_UPDATE_ROW_IN_TABLE);
    }
    if (!oldRowData) {
      throw new HttpException(
        {
          message: Messages.ROW_PRIMARY_KEY_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const oldRowDataLog = {
      ...oldRowData,
    };

    const futureRowData = Object.assign(oldRowData, row);
    const futurePrimaryKey = {};
    for (const primaryColumn of tablePrimaryKeys) {
      futurePrimaryKey[primaryColumn.column_name] = futureRowData[primaryColumn.column_name];
    }
    const formedTableStructure = formFullTableStructure(tableStructure, tableSettings);
    try {
      row = await hashPasswordsInRowUtil(row, tableWidgets);
      row = processUuidsInRowUtil(row, tableWidgets);
      await dao.updateRowInTable(tableName, row, primaryKey, userEmail);
      operationResult = OperationResultStatusEnum.successfully;
      let updatedRow = await dao.getRowByPrimaryKey(tableName, futurePrimaryKey, tableSettings, userEmail);
      updatedRow = removePasswordsFromRowsUtil(updatedRow, tableWidgets);
      return {
        row: updatedRow,
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
    } catch (e) {
      operationResult = OperationResultStatusEnum.unsuccessfully;
      throw new UnknownSQLException(e.message, ExceptionOperations.FAILED_TO_UPDATE_ROW_IN_TABLE);
    } finally {
      const logRecord = {
        table_name: tableName,
        userId: userId,
        connection: connection,
        operationType: LogOperationTypeEnum.updateRow,
        operationStatusResult: operationResult,
        row: row,
        old_data: oldRowDataLog,
      };
      await this.tableLogsService.crateAndSaveNewLogUtil(logRecord);
      const isTest = isTestConnectionUtil(connection);
      await this.amplitudeService.formAndSendLogRecord(
        isTest ? AmplitudeEventTypeEnum.tableRowAddedTest : AmplitudeEventTypeEnum.tableRowAdded,
        userId,
      );
      const foundAddTableActions = await this._dbContext.tableActionRepository.findTableActionsWithUpdateRowEvents(
        connectionId,
        tableName,
      );
      await this.tableActionActivationService.activateTableActions(
        foundAddTableActions,
        connection,
        primaryKey,
        userId,
        tableName,
        TableActionEventEnum.UPDATE_ROW,
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
    } catch (_e) {
      return {
        ...foreignKey,
        autocomplete_columns: [],
      };
    }
  }
}
