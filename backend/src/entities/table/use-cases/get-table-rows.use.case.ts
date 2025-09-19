import { BadRequestException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ForeignKeyWithAutocompleteColumnsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key-with-autocomplete-columns.ds.js';
import { ForeignKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key.ds.js';
import { TableSettingsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-settings.ds.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object-agent.interface.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object.interface.js';
import { FoundRowsDS } from '@rocketadmin/shared-code/src/data-access-layer/shared/data-structures/found-rows.ds.js';
import Sentry from '@sentry/minimal';
import JSON5 from 'json5';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import {
  AmplitudeEventTypeEnum,
  LogOperationTypeEnum,
  OperationResultStatusEnum,
  WidgetTypeEnum,
} from '../../../enums/index.js';
import { ExceptionOperations } from '../../../exceptions/custom-exceptions/exception-operation.js';
import { NonAvailableInFreePlanException } from '../../../exceptions/custom-exceptions/non-available-in-free-plan-exception.js';
import { UnknownSQLException } from '../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { hexToBinary, isBinary } from '../../../helpers/binary-to-hex.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { isConnectionTypeAgent, isObjectEmpty } from '../../../helpers/index.js';
import { AmplitudeService } from '../../amplitude/amplitude.service.js';
import { buildActionEventDto } from '../../table-actions/table-action-rules-module/utils/build-found-action-event-dto.util.js';
import { buildCreatedTableFilterRO } from '../../table-filters/utils/build-created-table-filters-response-object.util.js';
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
import { processRowsUtil } from '../utils/process-found-rows-util.js';
import { IGetTableRows } from './table-use-cases.interface.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import { findAvailableFields } from '../utils/find-available-fields.utils.js';

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

    if (connection.is_frozen) {
      throw new NonAvailableInFreePlanException(Messages.CONNECTION_IS_FROZEN);
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
        savedTableFilters,
        /* eslint-enable */
      ] = await Promise.all([
        this._dbContext.tableSettingsRepository.findTableSettingsPure(connectionId, tableName),
        dao.getTablePrimaryColumns(tableName, userEmail),
        dao.getTableForeignKeys(tableName, userEmail),
        dao.getTableStructure(tableName, userEmail),
        this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName),
        this._dbContext.customFieldsRepository.getCustomFields(connectionId, tableName),
        this._dbContext.userAccessRepository.getUserTablePermissions(userId, connectionId, tableName, masterPwd),
        this._dbContext.actionEventsRepository.findCustomEventsForTable(connectionId, tableName),
        this._dbContext.tableFiltersRepository.findTableFiltersForTableInConnection(tableName, connectionId),
      ]);
      const filteringFields: Array<FilteringFieldsDs> = isObjectEmpty(filters)
        ? findFilteringFieldsUtil(query, tableStructure)
        : parseFilteringFieldsFromBodyData(filters, tableStructure);

      const orderingField = findOrderingFieldUtil(query, tableStructure, tableSettings);

      const configured = !!tableSettings;

      const allowCsvExport = tableSettings ? tableSettings.allow_csv_export : true;
      const allowCsvImport = tableSettings ? tableSettings.allow_csv_import : true;
      const can_delete = tableSettings ? tableSettings.can_delete : true;
      const can_update = tableSettings ? tableSettings.can_update : true;
      const can_add = tableSettings ? tableSettings.can_add : true;

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
      if (
        isHexString(searchingFieldValue) &&
        (tableStructure.some((field) => isBinary(field.data_type)) ||
          connection.type === ConnectionTypesEnum.mongodb ||
          connection.type === ConnectionTypesEnum.agent_mongodb)
      ) {
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
        list_fields: findAvailableFields(tableSettings, tableStructure),
        action_events: customActionEvents.map((el) => buildActionEventDto(el)),
        table_actions: customActionEvents.map((el) => buildActionEventDto(el)),
        large_dataset: largeDataset,
        allow_csv_export: allowCsvExport,
        allow_csv_import: allowCsvImport,
        saved_filters: savedTableFilters.map((el) => buildCreatedTableFilterRO(el)),
        can_delete: can_delete,
        can_update: can_update,
        can_add: can_add,
        table_settings: {
          sortable_by: tableSettings?.sortable_by?.length > 0 ? tableSettings.sortable_by : [],
          ordering: tableSettings.ordering ? tableSettings.ordering : undefined,
          identity_column: tableSettings.identity_column ? tableSettings.identity_column : null,
          list_fields: tableSettings?.list_fields?.length > 0 ? tableSettings.list_fields : [],
          allow_csv_export: allowCsvExport,
          allow_csv_import: allowCsvImport,
          can_delete: can_delete,
          can_update: can_update,
          can_add: can_add,
        },
      };

      const identitiesMap = new Map<string, any[]>();

      if (tableForeignKeys?.length > 0) {
        for (const foreignKey of tableForeignKeys) {
          const foreignKeysValuesCollection = rowsRO.rows
            .map((row) => row[foreignKey.column_name])
            .filter((value) => value !== undefined) as (string | number)[];

          const foreignTableSettings = await this._dbContext.tableSettingsRepository.findTableSettings(
            connectionId,
            foreignKey.referenced_table_name,
          );

          const identityColumns = await this.getBatchedIdentityColumns(
            foreignKeysValuesCollection,
            foreignKey,
            dao,
            foreignTableSettings,
            userEmail,
          );

          if (!identitiesMap.has(foreignKey.referenced_table_name)) {
            identitiesMap.set(foreignKey.referenced_table_name, []);
          }
          identitiesMap.get(foreignKey.referenced_table_name)?.push(...identityColumns);
        }
      }

      const identities = Array.from(identitiesMap, ([referenced_table_name, identity_columns]) => ({
        referenced_table_name,
        identity_columns,
      }));

      const foreignKeysConformity = tableForeignKeys.map((key) => ({
        currentFKeyName: key.column_name,
        realFKeyName: key.referenced_column_name,
        referencedTableName: key.referenced_table_name,
      }));

      for (const element of foreignKeysConformity) {
        const identityForCurrentTable = identities.find(
          (el) => el.referenced_table_name === element.referencedTableName,
        );

        if (!identityForCurrentTable) continue;

        const identityColumnsMap = new Map(
          identityForCurrentTable.identity_columns.map((col) => [col[element.realFKeyName], col]),
        );

        for (const row of rowsRO.rows) {
          const identityForCurrentValue = identityColumnsMap.get(row[element.currentFKeyName]);
          row[element.currentFKeyName] =
            typeof identityForCurrentValue === 'object' && identityForCurrentValue !== null
              ? { ...identityForCurrentValue }
              : {};
        }
      }

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

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const results = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      results.push(array.slice(i, i + chunkSize));
    }
    return results;
  }

  private async getBatchedIdentityColumns(
    foreignKeysValuesCollection: Array<string | number>,
    foreignKey: ForeignKeyDS,
    dao: IDataAccessObject | IDataAccessObjectAgent,
    foreignTableSettings: TableSettingsDS,
    userEmail: string,
  ): Promise<Array<Record<string, unknown>>> {
    foreignKeysValuesCollection = [...new Set(foreignKeysValuesCollection)];
    const batchSize = 50;
    const chunkedValues = this.chunkArray(foreignKeysValuesCollection, batchSize);
    let identityColumns = [];

    for (const chunk of chunkedValues) {
      const result = await dao.getIdentityColumns(
        foreignKey.referenced_table_name,
        foreignKey.referenced_column_name,
        foreignTableSettings?.identity_column,
        chunk,
        userEmail,
      );
      identityColumns = identityColumns.concat(result);
    }

    return identityColumns;
  }
}
