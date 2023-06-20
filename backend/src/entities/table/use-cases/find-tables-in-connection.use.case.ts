import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import Sentry from '@sentry/node';
import PQueue from 'p-queue';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { AccessLevelEnum, AmplitudeEventTypeEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isConnectionTypeAgent } from '../../../helpers/index.js';
import { Logger } from '../../../helpers/logging/Logger.js';
import { AmplitudeService } from '../../amplitude/amplitude.service.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { isTestConnectionUtil } from '../../connection/utils/is-test-connection-util.js';
import { ITableAndViewPermissionData } from '../../permission/permission.interface.js';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity.js';
import { FindTablesDs } from '../application/data-structures/find-tables.ds.js';
import { FoundTableDs } from '../application/data-structures/found-table.ds.js';
import { buildTableFieldInfoEntity, buildTableInfoEntity } from '../utils/save-tables-info-in-database.util.js';
import { IFindTablesInConnection } from './table-use-cases.interface.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';
import { TableDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table.ds.js';
import { UnknownSQLException } from '../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { ExceptionOperations } from '../../../exceptions/custom-exceptions/exception-operation.js';
import { TableInfoEntity } from '../../table-info/table-info.entity.js';

@Injectable()
export class FindTablesInConnectionUseCase
  extends AbstractUseCase<FindTablesDs, Array<FoundTableDs>>
  implements IFindTablesInConnection
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private amplitudeService: AmplitudeService,
  ) {
    super();
  }

  protected async implementation(inputData: FindTablesDs): Promise<Array<FoundTableDs>> {
    const { connectionId, hiddenTablesOption, masterPwd, userId } = inputData;
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
    let operationResult = false;
    if (isConnectionTypeAgent(connection.type)) {
      userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
    }
    let tables: Array<TableDS>;
    try {
      tables = await dao.getTablesFromDB(userEmail);
      operationResult = true;
    } catch (e) {
      operationResult = false;
      throw new UnknownSQLException(e.message, ExceptionOperations.FAILED_TO_GET_TABLES);
    } finally {
      if (!connection.isTestConnection && tables && tables.length) {
        Logger.logInfo({
          tables: tables.map((table) => table.tableName),
          connectionId: connectionId,
          connectionType: connection.type,
        });
      }
      const isTest = isTestConnectionUtil(connection);
      await this.amplitudeService.formAndSendLogRecord(
        isTest ? AmplitudeEventTypeEnum.tableListReceivedTest : AmplitudeEventTypeEnum.tableListReceived,
        userId,
        { tablesCount: tables?.length ? tables.length : 0 },
      );
      if (
        connection.saved_table_info === 0 &&
        !connection.isTestConnection &&
        operationResult &&
        process.env.NODE_ENV !== 'test'
      ) {
        this.saveTableInfoInDatabase(connection, userId, tables);
      }
    }
    const tablesWithPermissions = await this.getUserPermissionsForAvailableTables(userId, connectionId, tables);
    const excludedTables = await this._dbContext.connectionPropertiesRepository.findConnectionProperties(connectionId);
    let tablesRO = await this.addDisplayNamesForTables(connectionId, tablesWithPermissions);
    if (excludedTables && excludedTables.hidden_tables.length > 0) {
      if (!hiddenTablesOption) {
        tablesRO = tablesRO.filter((tableRO) => {
          return !excludedTables.hidden_tables.includes(tableRO.table);
        });
      } else {
        const userConnectionEdit = await this._dbContext.userAccessRepository.checkUserConnectionEdit(
          userId,
          connectionId,
        );
        if (!userConnectionEdit) {
          throw new HttpException(
            {
              message: Messages.DONT_HAVE_PERMISSIONS,
            },
            HttpStatus.FORBIDDEN,
          );
        }
      }
    }
    return tablesRO.sort((tableRO1, tableRO2) => {
      const display_name1 = tableRO1.display_name;
      const display_name2 = tableRO2.display_name;
      if (display_name1 && display_name2) {
        return display_name1.localeCompare(display_name2);
      }
      if (!display_name1 && !display_name2) {
        return tableRO1.table.localeCompare(tableRO2.table);
      }
      if (!display_name1 && display_name2) {
        return tableRO1.table.localeCompare(display_name2);
      }
      if (display_name1 && !display_name2) {
        return display_name1.localeCompare(tableRO2.table);
      }
      return 0;
    });
  }

  private async addDisplayNamesForTables(
    connectionId: string,
    tablesObjArr: Array<ITableAndViewPermissionData>,
  ): Promise<Array<FoundTableDs>> {
    const tableSettings = await this._dbContext.tableSettingsRepository.findTableSettingsInConnection(connectionId);
    return tablesObjArr.map((tableObj: ITableAndViewPermissionData) => {
      const foundTableSettings =
        tableSettings[
          tableSettings.findIndex((el: TableSettingsEntity) => {
            return el.table_name === tableObj.tableName;
          })
        ];
      const displayName = foundTableSettings ? foundTableSettings.display_name : undefined;
      const icon = foundTableSettings ? foundTableSettings.icon : undefined;
      return {
        table: tableObj.tableName,
        isView: tableObj.isView || false,
        permissions: tableObj.accessLevel,
        display_name: displayName,
        icon: icon,
      };
    });
  }

  private async getUserPermissionsForAvailableTables(
    userId: string,
    connectionId: string,
    tables: Array<TableDS>,
  ): Promise<Array<ITableAndViewPermissionData>> {
    const connectionEdit = await this._dbContext.userAccessRepository.checkUserConnectionEdit(userId, connectionId);
    if (connectionEdit) {
      return tables.map((table) => {
        return {
          tableName: table.tableName,
          isView: table.isView,
          accessLevel: {
            visibility: true,
            readonly: false,
            add: true,
            delete: true,
            edit: true,
          },
        };
      });
    }

    const allTablePermissions =
      await this._dbContext.permissionRepository.getAllUserPermissionsForAllTablesInConnection(userId, connectionId);
    const tablesAndAccessLevels = {};
    tables.map((table) => {
      if (table.tableName !== '__proto__') {
        // eslint-disable-next-line security/detect-object-injection
        tablesAndAccessLevels[table.tableName] = [];
      }
    });
    tables.map((table) => {
      allTablePermissions.map((permission) => {
        if (permission.tableName === table.tableName && tablesAndAccessLevels.hasOwnProperty(table.tableName)) {
          // eslint-disable-next-line security/detect-object-injection
          tablesAndAccessLevels[table.tableName].push(permission.accessLevel);
        }
      });
    });
    const tablesWithPermissions: Array<ITableAndViewPermissionData> = [];
    for (const key in tablesAndAccessLevels) {
      if (tablesAndAccessLevels.hasOwnProperty(key)) {
        // eslint-disable-next-line security/detect-object-injection
        const addPermission = tablesAndAccessLevels[key].includes(AccessLevelEnum.add);
        // eslint-disable-next-line security/detect-object-injection
        const deletePermission = tablesAndAccessLevels[key].includes(AccessLevelEnum.delete);
        // eslint-disable-next-line security/detect-object-injection
        const editPermission = tablesAndAccessLevels[key].includes(AccessLevelEnum.edit);

        const readOnly = !(addPermission || deletePermission || editPermission);
        tablesWithPermissions.push({
          tableName: key,
          isView: tables.find((table) => table.tableName === key).isView,
          accessLevel: {
            // eslint-disable-next-line security/detect-object-injection
            visibility: tablesAndAccessLevels[key].includes(AccessLevelEnum.visibility),
            // eslint-disable-next-line security/detect-object-injection
            readonly: tablesAndAccessLevels[key].includes(AccessLevelEnum.readonly) && !readOnly,
            add: addPermission,
            delete: deletePermission,
            edit: editPermission,
          },
        });
      }
    }
    return tablesWithPermissions.filter((tableWithPermission: ITableAndViewPermissionData) => {
      return !!tableWithPermission.accessLevel.visibility;
    });
  }

  private async saveTableInfoInDatabase(
    connection: ConnectionEntity,
    userId: string,
    tables: Array<TableDS>,
  ): Promise<void> {
    try {
      const tableNames: Array<string> = tables.map((table) => table.tableName);
      const queue = new PQueue({ concurrency: 2 });
      const dao = getDataAccessObject(connection);
      const tablesStructures: Array<{
        tableName: string;
        structure: Array<TableStructureDS>;
      }> = await Promise.all(
        tableNames.map(async (tableName) => {
          return await queue.add(async () => {
            const structure = await dao.getTableStructure(tableName, undefined);
            return {
              tableName: tableName,
              structure: structure,
            };
          });
        }),
      ) as Array<{
        tableName: string;
        structure: Array<TableStructureDS>;
      }>
      connection.tables_info = await Promise.all(
        tablesStructures.map(async (tableStructure) => {
          return await queue.add(async () => {
            const newTableInfo = buildTableInfoEntity(tableStructure.tableName, connection);
            const savedTableInfo = await this._dbContext.tableInfoRepository.save(newTableInfo);
            const newTableFieldsInfos = tableStructure.structure.map((el) =>
              buildTableFieldInfoEntity(el, savedTableInfo),
            );
            newTableInfo.table_fields_info = await this._dbContext.tableFieldInfoRepository.save(newTableFieldsInfos);
            await this._dbContext.tableInfoRepository.save(newTableInfo);
            return newTableInfo;
          });
        }),
      ) as Array<TableInfoEntity>;
      connection.saved_table_info = ++connection.saved_table_info;
      await this._dbContext.connectionRepository.saveUpdatedConnection(connection);
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
    }
  }
}
