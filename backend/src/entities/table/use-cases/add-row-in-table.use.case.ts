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
import { activateTableActions } from '../../table-actions/utils/activate-table-action.util.js';

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
    const { connectionId, masterPwd, tableName, userId } = inputData;
    let { row } = inputData;
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

    const [
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

    const referencedTableNamesAndColumnsWithTablesDisplayNames: Array<ReferencedTableNamesAndColumnsDs> = [];

    for (const el of referencedTableNamesAndColumns) {
      const { referenced_by, referenced_on_column_name } = el;
      const referenced_by_with_display_name = await Promise.all(
        referenced_by.map(async (element) => {
          const foundTableSettings = await this._dbContext.tableSettingsRepository.findTableSettings(
            connectionId,
            element.table_name,
          );
          return {
            ...element,
            display_name: foundTableSettings?.display_name || null,
          };
        }),
      );

      referencedTableNamesAndColumnsWithTablesDisplayNames.push({
        referenced_on_column_name,
        referenced_by: referenced_by_with_display_name,
      });
    }

    if (tableSettings && !tableSettings?.can_add) {
      throw new HttpException(
        {
          message: Messages.CANT_DO_TABLE_OPERATION,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const foreignKeysFromWidgets: Array<ForeignKeyDSInfo> = tableWidgets
      .filter((el) => el.widget_type === WidgetTypeEnum.Foreign_key)
      .map((widget) => widget.widget_params as unknown as ForeignKeyDSInfo);

    let foreignKeysWithKeysFromWidgets = [...tableForeignKeys, ...foreignKeysFromWidgets];

    let foreignKeysWithAutocompleteColumns: Array<ForeignKeyWithAutocompleteColumnsDS> = [];

    const canUserReadForeignTables = await Promise.all(
      foreignKeysWithKeysFromWidgets.map(async (foreignKey) => {
        const canRead = await this._dbContext.userAccessRepository.checkTableRead(
          userId,
          connectionId,
          foreignKey.referenced_table_name,
          masterPwd,
        );
        return {
          tableName: foreignKey.referenced_table_name,
          canRead,
        };
      }),
    );

    const canReadMap = new Map(canUserReadForeignTables.map((item) => [item.tableName, item.canRead]));

    foreignKeysWithKeysFromWidgets = foreignKeysWithKeysFromWidgets.filter((foreignKey) =>
      canReadMap.get(foreignKey.referenced_table_name),
    );

    if (foreignKeysWithKeysFromWidgets?.length > 0) {
      foreignKeysWithAutocompleteColumns = await Promise.all(
        foreignKeysWithKeysFromWidgets.map(async (el) => {
          try {
            return await this.attachForeignColumnNames(el, userId, connectionId, dao);
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
      try {
        const foundAddTableActions = await this._dbContext.tableTriggersRepository.findTableActionsFromTriggersOnAddRow(
          connectionId,
          tableName,
        );
        await activateTableActions(foundAddTableActions, connection, row, userId, tableName);
      } catch (e) {
        console.error('Error activating table actions', e);
      }
    }
  }

  private async attachForeignColumnNames(
    foreignKey: ForeignKeyDS,
    userId: string,
    connectionId: string,
    dao: IDataAccessObject | IDataAccessObjectAgent,
  ): Promise<ForeignKeyWithAutocompleteColumnsDS> {
    try {
      const foreignTableSettings = await this._dbContext.tableSettingsRepository.findTableSettings(
        connectionId,
        foreignKey.referenced_table_name,
      );
      const foreignTableStructure = await dao.getTableStructure(foreignKey.referenced_table_name, userId);

      const columnNames = foreignTableStructure
        .map((el) => el.column_name)
        .filter((el) => foreignTableSettings?.autocomplete_columns.includes(el));

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
