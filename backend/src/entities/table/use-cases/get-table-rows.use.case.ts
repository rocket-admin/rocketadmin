import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object';
import {
  IDataAccessObject,
  IForeignKey,
  IForeignKeyWithForeignColumnName,
} from '../../../data-access-layer/shared/data-access-object-interface';
import {
  AmplitudeEventTypeEnum,
  LogOperationTypeEnum,
  OperationResultStatusEnum,
  WidgetTypeEnum,
} from '../../../enums';
import { Messages } from '../../../exceptions/text/messages';
import { isConnectionTypeAgent } from '../../../helpers';
import { AmplitudeService } from '../../amplitude/amplitude.service';
import { TableLogsService } from '../../table-logs/table-logs.service';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity';
import { FoundTableRowsDs } from '../application/data-structures/found-table-rows.ds';
import { GetTableRowsDs } from '../application/data-structures/get-table-rows.ds';
import { IForeignKeyInfo } from '../table.interface';
import { addCustomFieldsInRowsUtil } from '../utils/add-custom-fields-in-rows.util';
import { convertBinaryDataInRowsUtil } from '../utils/convert-binary-data-in-rows.util';
import { findAutocompleteFieldsUtil } from '../utils/find-autocomplete-fields.util';
import { findFilteringFieldsUtil } from '../utils/find-filtering-fields.util';
import { findOrderingFieldUtil } from '../utils/find-ordering-field.util';
import { formFullTableStructure } from '../utils/form-full-table-structure';
import { removePasswordsFromRowsUtil } from '../utils/remove-passwords-from-rows.util';
import { IGetTableRows } from './table-use-cases.interface';

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
    const { connectionId, masterPwd, page, perPage, query, searchingFieldValue, tableName, userId } = inputData;
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
      const dao = createDataAccessObject(connection, userId);

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
        tableActions,
        /* eslint-enable */
      ] = await Promise.all([
        this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
        dao.getTablePrimaryColumns(tableName, userEmail),
        dao.getTableForeignKeys(tableName, userEmail),
        dao.getTableStructure(tableName, userEmail),
        this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName),
        this._dbContext.customFieldsRepository.getCustomFields(connectionId, tableName),
        this._dbContext.userAccessRepository.getUserTablePermissions(userId, connectionId, tableName, masterPwd),
        this._dbContext.tableActionRepository.findTableActions(connectionId, tableName),
      ]);

      const filteringFields = findFilteringFieldsUtil(query, tableStructure);
      const orderingField = findOrderingFieldUtil(query, tableStructure, tableSettings);

      const configured = !!tableSettings;
      //todo rework in daos
      tableSettings = tableSettings ? tableSettings : ({} as TableSettingsEntity);

      let autocompleteFields = undefined;
      const autocomplete = query['autocomplete'];
      const referencedColumn = query['referencedColumn'];

      if (autocomplete && referencedColumn) {
        autocompleteFields = findAutocompleteFieldsUtil(query, tableStructure, tableSettings, referencedColumn);
      }

      if (orderingField) {
        tableSettings.ordering_field = orderingField.field;
        tableSettings.ordering = orderingField.value;
      }

      let rows = await dao.getRowsFromTable(
        tableName,
        tableSettings,
        page,
        perPage,
        searchingFieldValue,
        filteringFields,
        autocompleteFields,
        userEmail,
      );
      rows = addCustomFieldsInRowsUtil(rows, tableCustomFields);
      rows = convertBinaryDataInRowsUtil(rows, tableStructure);
      rows = removePasswordsFromRowsUtil(rows, tableWidgets);

      const foreignKeysFromWidgets: Array<IForeignKeyInfo> = tableWidgets
        .filter((el) => {
          return el.widget_type === WidgetTypeEnum.Foreign_key;
        })
        .map((widget) => {
          return widget.widget_params as unknown as IForeignKeyInfo;
        });

      tableForeignKeys = tableForeignKeys.concat(foreignKeysFromWidgets);

      if (tableForeignKeys && tableForeignKeys.length > 0) {
        tableForeignKeys = await Promise.all(
          tableForeignKeys.map((el) => {
            try {
              return this.attachForeignColumnNames(el, userId, connectionId, dao);
            } catch (e) {
              return el;
            }
          }),
        );
      }

      const formedTableStructure = formFullTableStructure(tableStructure, tableSettings);

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
        table_actions: tableActions,
      };
      let identities = [];

      if (tableForeignKeys && tableForeignKeys.length > 0) {
        identities = await Promise.all(
          tableForeignKeys.map(async (foreignKey) => {
            const foreignKeysValuesCollection = [];
            for (const row of rowsRO.rows) {
              if (row[foreignKey.column_name]) {
                foreignKeysValuesCollection.push(row[foreignKey.column_name]);
              }
            }
            const foreignTableSettings = await this._dbContext.tableSettingsRepository.findTableSettings(
              connectionId,
              foreignKey.referenced_table_name,
            );
            const identityColumns = await dao.getIdentityColumns(
              foreignKey.referenced_table_name,
              foreignKey.referenced_column_name,
              foreignTableSettings?.identity_column ? foreignTableSettings.identity_column : undefined,
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

      const foreignKeysConformity = [];

      for (const key of tableForeignKeys) {
        foreignKeysConformity.push({
          currentFKeyName: key.column_name,
          realFKeyName: key.referenced_column_name,
          referenced_table_name: key.referenced_table_name,
        });
      }

      for (const element of foreignKeysConformity) {
        const foundIdentityForCurrentTable = identities.find(
          (el) => el.referenced_table_name === element.referenced_table_name,
        );
        for (const row of rowsRO.rows) {
          const foundIdentityForCurrentValue = foundIdentityForCurrentTable?.identity_columns.find(
            (el) => el[element.realFKeyName] === row[element.currentFKeyName],
          );
          const newFKeyObj = {};
          if (foundIdentityForCurrentValue) {
            for (const key of Object.keys(foundIdentityForCurrentValue)) {
              // eslint-disable-next-line security/detect-object-injection
              newFKeyObj[key] = foundIdentityForCurrentValue[key];
            }
          }
          row[element.currentFKeyName] = newFKeyObj;
        }
      }
      operationResult = OperationResultStatusEnum.successfully;
      return rowsRO;
    } catch (e) {
      operationResult = OperationResultStatusEnum.unsuccessfully;
      throw new HttpException(
        {
          message: `${Messages.FAILED_GET_TABLE_ROWS} ${Messages.ERROR_MESSAGE}
         ${e.message} ${Messages.TRY_AGAIN_LATER}`,
        },
        HttpStatus.BAD_REQUEST,
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
