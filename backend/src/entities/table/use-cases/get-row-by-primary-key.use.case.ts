/* eslint-disable prefer-const */
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/src/data-access-layer/shared/create-data-access-object.js';
import { WidgetTypeEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { compareArrayElements, isConnectionTypeAgent } from '../../../helpers/index.js';
import { GetRowByPrimaryKeyDs } from '../application/data-structures/get-row-by-primary-key.ds.js';
import { ForeignKeyDSInfo, ReferencedTableNamesAndColumnsDs, TableRowRODs } from '../table-datastructures.js';
import { convertBinaryDataInRowUtil } from '../utils/convert-binary-data-in-row.util.js';
import { convertHexDataInPrimaryKeyUtil } from '../utils/convert-hex-data-in-primary-key.util.js';
import { formFullTableStructure } from '../utils/form-full-table-structure.js';
import { removePasswordsFromRowsUtil } from '../utils/remove-password-from-row.util.js';
import { IGetRowByPrimaryKey } from './table-use-cases.interface.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/src/data-access-layer/shared/interfaces/data-access-object-agent.interface.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/src/data-access-layer/shared/interfaces/data-access-object.interface.js';
import { ForeignKeyWithAutocompleteColumnsDS } from '@rocketadmin/shared-code/src/data-access-layer/shared/data-structures/foreign-key-with-autocomplete-columns.ds.js';
import { ForeignKeyDS } from '@rocketadmin/shared-code/src/data-access-layer/shared/data-structures/foreign-key.ds.js';
import { UnknownSQLException } from '../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { ExceptionOperations } from '../../../exceptions/custom-exceptions/exception-operation.js';
import { ReferencedTableNamesAndColumnsDS } from '@rocketadmin/shared-code/src/data-access-layer/shared/data-structures/referenced-table-names-columns.ds.js';
import JSON5 from 'json5';
import { buildActionEventDto } from '../../table-actions/table-action-rules-module/utils/build-found-action-event-dto.util.js';
import { NonAvailableInFreePlanException } from '../../../exceptions/custom-exceptions/non-available-in-free-plan-exception.js';
import { findAvailableFields } from '../utils/find-available-fields.utils.js';

@Injectable()
export class GetRowByPrimaryKeyUseCase
  extends AbstractUseCase<GetRowByPrimaryKeyDs, TableRowRODs>
  implements IGetRowByPrimaryKey
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: GetRowByPrimaryKeyDs): Promise<TableRowRODs> {
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

    if (connection.is_frozen) {
      throw new NonAvailableInFreePlanException(Messages.CONNECTION_IS_FROZEN);
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
      customActionEvents,
      referencedTableNamesAndColumns,
      tableAccessLevel,
    ] = await Promise.all([
      dao.getTableStructure(tableName, userEmail),
      this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName),
      this._dbContext.tableSettingsRepository.findTableSettingsPure(connectionId, tableName),
      dao.getTableForeignKeys(tableName, userEmail),
      dao.getTablePrimaryColumns(tableName, userEmail),
      this._dbContext.actionEventsRepository.findCustomEventsForTable(connectionId, tableName),
      dao.getReferencedTableNamesAndColumns(tableName, userEmail),
      this._dbContext.userAccessRepository.getUserTablePermissions(userId, connectionId, tableName, masterPwd),
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
    const canUserReadForeignTables: Array<{
      tableName: string;
      canRead: boolean;
    }> = await Promise.all(
      tableForeignKeys.map(async (foreignKey) => {
        const cenTableRead = await this._dbContext.userAccessRepository.improvedCheckTableRead(
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

    let foreignKeysWithAutocompleteColumns: Array<ForeignKeyWithAutocompleteColumnsDS> = [];
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
    let rowData: Record<string, unknown>;
    try {
      rowData = await dao.getRowByPrimaryKey(tableName, primaryKey, tableSettings, userEmail);
    } catch (e) {
      throw new UnknownSQLException(e.message, ExceptionOperations.FAILED_TO_GET_ROW_BY_PRIMARY_KEY);
    }

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

    for (const referencedTable of referencedTableNamesAndColumns) {
      referencedTable.referenced_by = await Promise.all(
        referencedTable.referenced_by.map(async (referencedByTable) => {
          const canUserReadTable = await this._dbContext.userAccessRepository.improvedCheckTableRead(
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
    //todo remove unnecessary fields
    return {
      row: rowData,
      foreignKeys: foreignKeysWithAutocompleteColumns,
      primaryColumns: tablePrimaryKeys,
      structure: formedTableStructure,
      table_widgets: tableWidgets,
      readonly_fields: tableSettings?.readonly_fields ? tableSettings.readonly_fields : [],
      list_fields: findAvailableFields(tableSettings, tableStructure),
      action_events: customActionEvents.map((event) => buildActionEventDto(event)),
      table_actions: customActionEvents.map((el) => buildActionEventDto(el)),
      identity_column: tableSettings?.identity_column ? tableSettings.identity_column : null,
      referenced_table_names_and_columns: referencedTableNamesAndColumnsWithTablesDisplayNames,
      display_name: tableSettings?.display_name ? tableSettings.display_name : null,
      table_access_level: tableAccessLevel.accessLevel,
      excluded_fields: tableSettings?.excluded_fields ? tableSettings.excluded_fields : [],
      can_delete: tableSettings ? tableSettings.can_delete : true,
      can_update: tableSettings ? tableSettings.can_update : true,
      can_add: tableSettings ? tableSettings.can_add : true,
      table_settings: {
        sortable_by: tableSettings?.sortable_by?.length > 0 ? tableSettings.sortable_by : [],
        ordering: tableSettings?.ordering ? tableSettings.ordering : undefined,
        identity_column: tableSettings?.identity_column ? tableSettings.identity_column : null,
        list_fields: tableSettings?.list_fields?.length > 0 ? tableSettings.list_fields : [],
        allow_csv_export: tableSettings ? tableSettings.allow_csv_export : true,
        allow_csv_import: tableSettings ? tableSettings.allow_csv_import : true,
        can_delete: tableSettings ? tableSettings.can_delete : true,
        can_update: tableSettings ? tableSettings.can_update : true,
        can_add: tableSettings ? tableSettings.can_add : true,
      },
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
    } catch (_e) {
      return {
        ...foreignKey,
        autocomplete_columns: [],
      };
    }
  }
}
