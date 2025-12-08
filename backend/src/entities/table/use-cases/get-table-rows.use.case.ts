import { BadRequestException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ForeignKeyWithAutocompleteColumnsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key-with-autocomplete-columns.ds.js';
import { ForeignKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key.ds.js';
import { TableSettingsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-settings.ds.js';
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
import { findAvailableFields } from '../utils/find-available-fields.utils.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object-agent.interface.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object.interface.js';

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

      // eslint-disable-next-line prefer-const
      let { tableSettings, tableCustomFields, tableWidgets } =
        await this._dbContext.tableSettingsRepository.findTableCustoms(connectionId, tableName);

      /* eslint-disable */
      let [
        tablePrimaryColumns,
        tableForeignKeys,
        tableStructure,
        userTablePermissions,
        customActionEvents,
        savedTableFilters,
        /* eslint-enable */
      ] = await Promise.all([
        dao.getTablePrimaryColumns(tableName, userEmail),
        dao.getTableForeignKeys(tableName, userEmail),
        dao.getTableStructure(tableName, userEmail),
        this._dbContext.userAccessRepository.getUserTablePermissions(userId, connectionId, tableName, masterPwd),
        this._dbContext.actionEventsRepository.findCustomEventsForTable(connectionId, tableName),
        this._dbContext.tableFiltersRepository.findTableFiltersForTableInConnection(tableName, connectionId),
      ]);
      const filteringFields: Array<FilteringFieldsDs> = isObjectEmpty(filters)
        ? findFilteringFieldsUtil(query, tableStructure)
        : parseFilteringFieldsFromBodyData(filters, tableStructure);

      const orderingField = findOrderingFieldUtil(query, tableStructure, tableSettings);

      const configured = !!tableSettings;

      const allowCsvExport = tableSettings?.allow_csv_export ?? true;
      const allowCsvImport = tableSettings?.allow_csv_import ?? true;
      const can_delete = tableSettings?.can_delete ?? true;
      const can_update = tableSettings?.can_update ?? true;
      const can_add = tableSettings?.can_add ?? true;

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
          tableStructure,
          userEmail,
        );
      } catch (e) {
        Sentry.captureException(e);
        throw new UnknownSQLException(e.message, ExceptionOperations.FAILED_TO_GET_ROWS_FROM_TABLE);
      }
      rows = processRowsUtil(rows, tableWidgets, tableStructure, tableCustomFields);

      const foreignKeysFromWidgets: Array<ForeignKeyDSInfo> = tableWidgets
        .filter((widget) => widget.widget_type === WidgetTypeEnum.Foreign_key)
        .reduce<Array<ForeignKeyDSInfo>>((acc, widget) => {
          if (widget.widget_params) {
            try {
              const widgetParams = JSON5.parse(widget.widget_params) as ForeignKeyDSInfo;
              acc.push(widgetParams);
            } catch (_e) {
              //
            }
          }
          return acc;
        }, []);

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
          tableForeignKeys.map((el) => this.attachForeignColumnNames(el, userId, connectionId, dao).catch(() => el)),
        );
      }

      const formedTableStructure = formFullTableStructure(tableStructure, tableSettings);

      const largeDataset = rows.large_dataset || rows.pagination.total > Constants.LARGE_DATASET_ROW_LIMIT;

      const listFields = findAvailableFields(tableSettings, tableStructure);
      const actionEventsDtos = customActionEvents.map((el) => buildActionEventDto(el));
      const savedFiltersRO = savedTableFilters.map((el) => buildCreatedTableFilterRO(el));

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
        list_fields: listFields,
        action_events: actionEventsDtos,
        table_actions: actionEventsDtos,
        large_dataset: largeDataset,
        allow_csv_export: allowCsvExport,
        allow_csv_import: allowCsvImport,
        saved_filters: savedFiltersRO,
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
        const uniqueReferencedTables = [...new Set(tableForeignKeys.map((fk) => fk.referenced_table_name))];
        const foreignTableSettingsPromises = uniqueReferencedTables.map((tableName) =>
          this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName).then((settings) => ({
            tableName,
            settings,
          })),
        );
        const foreignTableSettingsResults = await Promise.all(foreignTableSettingsPromises);
        const foreignTableSettingsMap = new Map(
          foreignTableSettingsResults.map((result) => [result.tableName, result.settings]),
        );

        const foreignKeyDataMap = new Map<string, { foreignKey: ForeignKeyDS; values: Set<string | number> }>();

        for (const foreignKey of tableForeignKeys) {
          const valuesSet = new Set<string | number>();
          for (const row of rowsRO.rows) {
            const value = row[foreignKey.column_name];
            if (value !== undefined && value !== null) {
              valuesSet.add(value as string | number);
            }
          }

          const key = `${foreignKey.referenced_table_name}:${foreignKey.referenced_column_name}`;
          if (foreignKeyDataMap.has(key)) {
            const existing = foreignKeyDataMap.get(key);
            valuesSet.forEach((v) => existing!.values.add(v));
          } else {
            foreignKeyDataMap.set(key, { foreignKey, values: valuesSet });
          }
        }

        const identityPromises = Array.from(foreignKeyDataMap.values()).map(async ({ foreignKey, values }) => {
          const foreignTableSettings = foreignTableSettingsMap.get(foreignKey.referenced_table_name);
          const identityColumns = await this.getBatchedIdentityColumns(
            Array.from(values),
            foreignKey,
            dao,
            foreignTableSettings,
            userEmail,
          );
          return { foreignKey, identityColumns };
        });

        const identityResults = await Promise.all(identityPromises);

        for (const { foreignKey, identityColumns } of identityResults) {
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

      const identityLookupMaps = new Map<string, Map<any, any>>();
      for (const element of foreignKeysConformity) {
        const identityForCurrentTable = identities.find(
          (el) => el.referenced_table_name === element.referencedTableName,
        );

        if (!identityForCurrentTable) continue;

        const lookupKey = `${element.referencedTableName}:${element.realFKeyName}`;
        if (!identityLookupMaps.has(lookupKey)) {
          const identityColumnsMap = new Map(
            identityForCurrentTable.identity_columns.map((col) => [col[element.realFKeyName], col]),
          );
          identityLookupMaps.set(lookupKey, identityColumnsMap);
        }
      }

      for (const row of rowsRO.rows) {
        for (const element of foreignKeysConformity) {
          const lookupKey = `${element.referencedTableName}:${element.realFKeyName}`;
          const identityColumnsMap = identityLookupMaps.get(lookupKey);

          if (!identityColumnsMap) continue;

          const identityForCurrentValue = identityColumnsMap.get(row[element.currentFKeyName]);
          row[element.currentFKeyName] =
            typeof identityForCurrentValue === 'object' && identityForCurrentValue !== null
              ? identityForCurrentValue
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
        this._dbContext.tableSettingsRepository.findTableSettingsPure(connectionId, foreignKey.referenced_table_name),
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
    const uniqueValues = [...new Set(foreignKeysValuesCollection)];

    if (uniqueValues.length === 0) {
      return [];
    }

    const batchSize = 50;

    if (uniqueValues.length <= batchSize) {
      return await dao.getIdentityColumns(
        foreignKey.referenced_table_name,
        foreignKey.referenced_column_name,
        foreignTableSettings?.identity_column,
        uniqueValues,
        userEmail,
      );
    }

    const chunkedValues = this.chunkArray(uniqueValues, batchSize);
    const results = await Promise.all(
      chunkedValues.map((chunk) =>
        dao.getIdentityColumns(
          foreignKey.referenced_table_name,
          foreignKey.referenced_column_name,
          foreignTableSettings?.identity_column,
          chunk,
          userEmail,
        ),
      ),
    );

    return results.flat();
  }
}
