import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import PQueue from 'p-queue';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object';
import { ITableStructure } from '../../../data-access-layer/shared/data-access-object-interface';
import { AccessLevelEnum, AmplitudeEventTypeEnum } from '../../../enums';
import { Messages } from '../../../exceptions/text/messages';
import { isConnectionTypeAgent } from '../../../helpers';
import { Logger } from '../../../helpers/logging/Logger';
import { AmplitudeService } from '../../amplitude/amplitude.service';
import { ConnectionEntity } from '../../connection/connection.entity';
import { isTestConnectionUtil } from '../../connection/utils/is-test-connection-util';
import { ITablePermissionData } from '../../permission/permission.interface';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity';
import { FindTablesDs } from '../application/data-structures/find-tables.ds';
import { FoundTableDs } from '../application/data-structures/found-table.ds';
import { buildTableFieldInfoEntity, buildTableInfoEntity } from '../utils/save-tables-info-in-database.util';
import { IFindTablesInConnection } from './table-use-cases.interface';

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
    const dao = createDataAccessObject(connection, userId);
    let userEmail;
    let operationResult = false;
    if (isConnectionTypeAgent(connection.type)) {
      userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
    }
    let tables;
    try {
      tables = await dao.getTablesFromDB(userEmail);
      operationResult = true;
    } catch (e) {
      throw new HttpException(
        {
          message: `${Messages.FAILED_GET_TABLES} ${Messages.ERROR_MESSAGE}
         ${e.message} ${Messages.TRY_AGAIN_LATER}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      if (!connection.isTestConnection) {
        Logger.logInfo({
          tables: tables,
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
    tablesObjArr: Array<ITablePermissionData>,
  ): Promise<Array<FoundTableDs>> {
    const tableSettings = await this._dbContext.tableSettingsRepository.findTableSettingsInConnection(connectionId);
    return tablesObjArr.map((tableObj: ITablePermissionData) => {
      const displayName =
        tableSettings[
          tableSettings.findIndex((el: TableSettingsEntity) => {
            return el.table_name === tableObj.tableName;
          })
        ]?.display_name;
      return {
        table: tableObj.tableName,
        permissions: tableObj.accessLevel,
        display_name: displayName ? displayName : undefined,
      };
    });
  }

  private async getUserPermissionsForAvailableTables(
    userId: string,
    connectionId: string,
    tableNames: Array<string>,
  ): Promise<Array<ITablePermissionData>> {
    const connectionEdit = await this._dbContext.userAccessRepository.checkUserConnectionEdit(userId, connectionId);
    if (connectionEdit) {
      return tableNames.map((tableName) => {
        return {
          tableName: tableName,
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
    tableNames.map((tableName) => {
      if (tableName !== '__proto__') {
        // eslint-disable-next-line security/detect-object-injection
        tablesAndAccessLevels[tableName] = [];
      }
    });
    tableNames.map((tableName) => {
      allTablePermissions.map((permission) => {
        if (permission.tableName === tableName && tablesAndAccessLevels.hasOwnProperty(tableName)) {
          // eslint-disable-next-line security/detect-object-injection
          tablesAndAccessLevels[tableName].push(permission.accessLevel);
        }
      });
    });
    const tablesWithPermissions: Array<ITablePermissionData> = [];
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
    return tablesWithPermissions.filter((tableWithPermission: ITablePermissionData) => {
      return !!tableWithPermission.accessLevel.visibility;
    });
  }

  private async saveTableInfoInDatabase(
    connection: ConnectionEntity,
    userId: string,
    tables: Array<string>,
  ): Promise<void> {
    try {
      const queue = new PQueue({ concurrency: 2 });
      const dao = createDataAccessObject(connection, userId);
      const tablesStructures: Array<{
        tableName: string;
        structure: Array<ITableStructure>;
      }> = await Promise.all(
        tables.map(async (tableName) => {
          return await queue.add(async () => {
            const structure = await dao.getTableStructure(tableName, undefined);
            return {
              tableName: tableName,
              structure: structure,
            };
          });
        }),
      );
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
      );
      connection.saved_table_info = ++connection.saved_table_info;
      await this._dbContext.connectionRepository.saveUpdatedConnection(connection);
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
    }
  }
}
