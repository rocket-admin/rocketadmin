import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { WidgetTypeEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isConnectionTypeAgent } from '../../../helpers/index.js';
import { buildFoundTableWidgetDs } from '../../widget/utils/build-found-table-widget-ds.js';
import { GetTableStructureDs } from '../application/data-structures/get-table-structure-ds.js';
import { ForeignKeyDSInfo, TableStructureDs } from '../table-datastructures.js';
import { formFullTableStructure } from '../utils/form-full-table-structure.js';
import { IGetTableStructure } from './table-use-cases.interface.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object.interface.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object-agent.interface.js';
import { ForeignKeyWithAutocompleteColumnsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key-with-autocomplete-columns.ds.js';
import { ForeignKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key.ds.js';
import { UnknownSQLException } from '../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { ExceptionOperations } from '../../../exceptions/custom-exceptions/exception-operation.js';
import JSON5 from 'json5';

@Injectable()
export class GetTableStructureUseCase
  extends AbstractUseCase<GetTableStructureDs, TableStructureDs>
  implements IGetTableStructure
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: GetTableStructureDs): Promise<TableStructureDs> {
    const { connectionId, masterPwd, tableName, userId } = inputData;
    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      masterPwd,
    );
    if (!foundConnection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const dao = getDataAccessObject(foundConnection);

      let userEmail: string;
      if (isConnectionTypeAgent(foundConnection.type)) {
        userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
      }
      // eslint-disable-next-line prefer-const
      let [tableSettings, tablePrimaryColumns, tableForeignKeys, tableStructure, tableWidgets] = await Promise.all([
        this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
        dao.getTablePrimaryColumns(tableName, userEmail),
        dao.getTableForeignKeys(tableName, userEmail),
        dao.getTableStructure(tableName, userEmail),
        this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName),
      ]);
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
      let transformedTableForeignKeys: Array<ForeignKeyWithAutocompleteColumnsDS> = [];
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
        transformedTableForeignKeys = await Promise.all(
          tableForeignKeys.map((el) => {
            try {
              return this.attachForeignColumnNames(el, userId, connectionId, dao);
            } catch (_e) {
              return el as ForeignKeyWithAutocompleteColumnsDS;
            }
          }),
        );
      }
      const readonly_fields = tableSettings?.readonly_fields?.length > 0 ? tableSettings.readonly_fields : [];
      const formedTableStructure = formFullTableStructure(tableStructure, tableSettings);
      return {
        structure: formedTableStructure,
        primaryColumns: tablePrimaryColumns,
        foreignKeys: transformedTableForeignKeys,
        readonly_fields: readonly_fields,
        table_widgets: tableWidgets?.length > 0 ? tableWidgets.map((widget) => buildFoundTableWidgetDs(widget)) : [],
        list_fields: tableSettings?.list_fields ? tableSettings.list_fields : [],
        display_name: tableSettings?.display_name ? tableSettings.display_name : null,
      };
    } catch (e) {
      throw new UnknownSQLException(e.message, ExceptionOperations.FAILED_TO_GET_TABLE_STRUCTURE);
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
