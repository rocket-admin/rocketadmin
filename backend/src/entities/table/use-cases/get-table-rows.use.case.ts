import { BadRequestException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
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
import { hexToBinary, isBinary } from '../../../helpers/binary-to-hex.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { isConnectionTypeAgent, isObjectEmpty } from '../../../helpers/index.js';
import { AmplitudeService } from '../../amplitude/amplitude.service.js';
import { TableLogsService } from '../../table-logs/table-logs.service.js';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity.js';
import { FoundTableRowsDs } from '../application/data-structures/found-table-rows.ds.js';
import { GetTableRowsDs } from '../application/data-structures/get-table-rows.ds.js';
import { FilteringFieldsDs, ForeignKeyDSInfo } from '../table-datastructures.js';
import { findAutocompleteFieldsUtil } from '../utils/find-autocomplete-fields.util.js';
import { findFilteringFieldsUtil, parseFilteringFieldsFromBodyData } from '../utils/find-filtering-fields.util.js';
import { findOrderingFieldUtil } from '../utils/find-ordering-field.util.js';
import { formFullTableStructure } from '../utils/form-full-table-structure.js';
import { isHexString } from '../utils/is-hex-string.js';
import { IGetTableRows } from './table-use-cases.interface.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object-agent.interface.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object.interface.js';
import { ForeignKeyWithAutocompleteColumnsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key-with-autocomplete-columns.ds.js';
import { ForeignKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key.ds.js';
import { FoundRowsDS } from '@rocketadmin/shared-code/src/data-access-layer/shared/data-structures/found-rows.ds.js';
import { UnknownSQLException } from '../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { ExceptionOperations } from '../../../exceptions/custom-exceptions/exception-operation.js';
import Sentry from '@sentry/minimal';
import { processRowsUtil } from '../utils/process-found-rows-util.js';
import JSON5 from 'json5';
import { buildActionEventDto } from '../../table-actions/table-action-rules-module/utils/build-found-action-event-dto.util.js';

@Injectable()
export class GetTableRowsUseCase extends AbstractUseCase<GetTableRowsDs, FoundTableRowsDs> implements IGetTableRows {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private amplitudeService: AmplitudeService,
    private tableLogsService: TableLogsService,
  ) {
    super();
  }

  protected async implementation(inputData: GetTableRowsDs): Promise<FoundTableRowsDs> {
    let operationResult = OperationResultStatusEnum.unknown;

    const { connectionId, masterPwd, page, perPage, query, tableName, userId, filters } = inputData;
    let { searchingFieldValue } = inputData;
    const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
    if (!connection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const dao = getDataAccessObject(connection);
      const tablesInConnection = await dao.getTablesFromDB();
      const tableNames = tablesInConnection.map((table) => table.tableName);
      if (!tableNames.includes(tableName)) {
        throw new BadRequestException(Messages.TABLE_NOT_FOUND);
      }

      let userEmail: string;
      if (isConnectionTypeAgent(connection.type)) {
        userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
      }

      /* eslint-disable */
      let [
        tableSettings,
        tablePrimaryColumns,
        tableForeignKeys,
        tableStructure,
        tableWidgets,
        tableCustomFields,
        userTablePermissions,
        customActionEvents,
        /* eslint-enable */
      ] = await Promise.all([
        this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
        dao.getTablePrimaryColumns(tableName, userEmail),
        dao.getTableForeignKeys(tableName, userEmail),
        dao.getTableStructure(tableName, userEmail),
        this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName),
        this._dbContext.customFieldsRepository.getCustomFields(connectionId, tableName),
        this._dbContext.userAccessRepository.getUserTablePermissions(userId, connectionId, tableName, masterPwd),
        this._dbContext.actionEventsRepository.findCustomEventsForTable(connectionId, tableName),
      ]);

      const filteringFields: Array<FilteringFieldsDs> = isObjectEmpty(filters)
        ? findFilteringFieldsUtil(query, tableStructure)
        : parseFilteringFieldsFromBodyData(filters, tableStructure);

      const orderingField = findOrderingFieldUtil(query, tableStructure, tableSettings);

      const configured = !!tableSettings;

      const allowCsvExport = tableSettings ? tableSettings.allow_csv_export : true;
      const allowCsvImport = tableSettings ? tableSettings.allow_csv_import : true;

      //todo rework in daos
      tableSettings = tableSettings ? tableSettings : ({} as TableSettingsEntity);

      const { autocomplete, referencedColumn } = query;

      const autocompleteFields =
        autocomplete && referencedColumn
          ? findAutocompleteFieldsUtil(query, tableStructure, tableSettings, referencedColumn)
          : undefined;

      if (orderingField) {
        tableSettings.ordering_field = orderingField.field;
        tableSettings.ordering = orderingField.value;
      }

      if (isHexString(searchingFieldValue)) {
        searchingFieldValue = hexToBinary(searchingFieldValue) as any;
        tableSettings.search_fields = tableStructure
          .filter((field) => isBinary(field.data_type))
          .map((field) => field.column_name);
        if (connection.type === 'mongodb' || connection.type === 'agent_mongodb') {
          tableSettings.search_fields.push('_id');
        }
      }

      let rows: FoundRowsDS;
      try {
        rows = await dao.getRowsFromTable(
          tableName,
          tableSettings,
          page,
          perPage,
          searchingFieldValue,
          filteringFields,
          autocompleteFields,
          userEmail,
        );
      } catch (e) {
        Sentry.captureException(e);
        throw new UnknownSQLException(e.message, ExceptionOperations.FAILED_TO_GET_ROWS_FROM_TABLE);
      }

      rows = processRowsUtil(rows, tableWidgets, tableStructure, tableCustomFields);

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

      tableForeignKeys = [...tableForeignKeys, ...foreignKeysFromWidgets];

      const canUserReadForeignTables = await Promise.all(
        tableForeignKeys.map((foreignKey) =>
          this._dbContext.userAccessRepository
            .improvedCheckTableRead(userId, connectionId, foreignKey.referenced_table_name, masterPwd)
            .then((canRead) => ({
              tableName: foreignKey.referenced_table_name,
              canRead,
            })),
        ),
      );

      const readableForeignTables = new Set(
        canUserReadForeignTables.filter(({ canRead }) => canRead).map(({ tableName }) => tableName),
      );

      tableForeignKeys = tableForeignKeys.filter(({ referenced_table_name }) =>
        readableForeignTables.has(referenced_table_name),
      );

      if (tableForeignKeys && tableForeignKeys.length > 0) {
        tableForeignKeys = await Promise.all(
          tableForeignKeys.map((el) => {
            try {
              return this.attachForeignColumnNames(el, userId, connectionId, dao);
            } catch (_e) {
              return el;
            }
          }),
        );
      }

      const formedTableStructure = formFullTableStructure(tableStructure, tableSettings);

      const largeDataset = rows.large_dataset
        ? true
        : rows.pagination.total > Constants.LARGE_DATASET_ROW_LIMIT
          ? true
          : false;

      const rowsRO = {
        rows: rows.data,
        primaryColumns: tablePrimaryColumns,
        pagination: rows.pagination,
        sortable_by: tableSettings?.sortable_by?.length > 0 ? tableSettings.sortable_by : [],
        ordering_field: tableSettings.ordering_field ? tableSettings.ordering_field : undefined,
        ordering: tableSettings.ordering ? tableSettings.ordering : undefined,
        columns_view: tableSettings.columns_view ? tableSettings.columns_view : undefined,
        structure: formedTableStructure,
        foreignKeys: tableForeignKeys,
        configured: configured,
        widgets: tableWidgets,
        identity_column: tableSettings.identity_column ? tableSettings.identity_column : null,
        table_permissions: userTablePermissions,
        list_fields: tableSettings.list_fields?.length > 0 ? tableSettings.list_fields : [],
        action_events: customActionEvents.map((el) => buildActionEventDto(el)),
        table_actions: customActionEvents.map((el) => buildActionEventDto(el)),
        large_dataset: largeDataset,
        allow_csv_export: allowCsvExport,
        allow_csv_import: allowCsvImport,
      };

      let identities = [];

      if (tableForeignKeys?.length > 0) {
        identities = await Promise.all(
          tableForeignKeys.map(async (foreignKey) => {
            const foreignKeysValuesCollection = rowsRO.rows
              .filter((row) => row[foreignKey.column_name])
              .map((row) => row[foreignKey.column_name]) as (string | number)[];

            const foreignTableSettings = await this._dbContext.tableSettingsRepository.findTableSettings(
              connectionId,
              foreignKey.referenced_table_name,
            );

            const identityColumns = await dao.getIdentityColumns(
              foreignKey.referenced_table_name,
              foreignKey.referenced_column_name,
              foreignTableSettings?.identity_column,
              foreignKeysValuesCollection,
              userEmail,
            );

            return {
              referenced_table_name: foreignKey.referenced_table_name,
              identity_columns: identityColumns,
            };
          }),
        );
      }

      const foreignKeysConformity = tableForeignKeys.map((key) => ({
        currentFKeyName: key.column_name,
        realFKeyName: key.referenced_column_name,
        referenced_table_name: key.referenced_table_name,
      }));

      foreignKeysConformity.forEach((element) => {
        const foundIdentityForCurrentTable = identities.find(
          (el) => el.referenced_table_name === element.referenced_table_name,
        );

        rowsRO.rows.forEach((row) => {
          const foundIdentityForCurrentValue = foundIdentityForCurrentTable?.identity_columns.find(
            (el) => el[element.realFKeyName] === row[element.currentFKeyName],
          );

          row[element.currentFKeyName] = foundIdentityForCurrentValue ? { ...foundIdentityForCurrentValue } : {};
        });
      });

      operationResult = OperationResultStatusEnum.successfully;
      return rowsRO;
    } catch (e) {
      Sentry.captureException(e);
      operationResult = OperationResultStatusEnum.unsuccessfully;
      if (e instanceof HttpException) {
        throw e;
      }
      throw new HttpException(
        {
          message: `${Messages.FAILED_GET_TABLE_ROWS} ${Messages.ERROR_MESSAGE}
         ${e.message} ${Messages.TRY_AGAIN_LATER}`,
          originalMessage: e.originalMessage ? `${Messages.ERROR_MESSAGE_ORIGINAL} ${e.originalMessage}` : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      const logRecord = {
        table_name: tableName,
        userId: userId,
        connection: connection,
        operationType: LogOperationTypeEnum.rowsReceived,
        operationStatusResult: operationResult,
      };
      await this.tableLogsService.crateAndSaveNewLogUtil(logRecord);
      const isTest = await this._dbContext.connectionRepository.isTestConnectionById(connectionId);
      await this.amplitudeService.formAndSendLogRecord(
        isTest ? AmplitudeEventTypeEnum.tableRowsReceivedTest : AmplitudeEventTypeEnum.tableRowsReceived,
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

      const columnNames = foreignTableStructure
        .map((el) => el.column_name)
        .filter((el) => foreignTableSettings?.autocomplete_columns.includes(el));

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
