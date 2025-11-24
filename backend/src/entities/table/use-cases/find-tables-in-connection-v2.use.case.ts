import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/src/data-access-layer/shared/create-data-access-object.js';
import { TableStructureDS } from '@rocketadmin/shared-code/src/data-access-layer/shared/data-structures/table-structure.ds.js';
import { TableDS } from '@rocketadmin/shared-code/src/data-access-layer/shared/data-structures/table.ds.js';
import * as Sentry from '@sentry/node';
import PQueue from 'p-queue';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AccessLevelEnum } from '../../../enums/access-level.enum.js';
import { AmplitudeEventTypeEnum } from '../../../enums/amplitude-event-type.enum.js';
import { ExceptionOperations } from '../../../exceptions/custom-exceptions/exception-operation.js';
import { UnknownSQLException } from '../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { isObjectPropertyExists } from '../../../helpers/validators/is-object-property-exists-validator.js';
import { AmplitudeService } from '../../amplitude/amplitude.service.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { isTestConnectionUtil } from '../../connection/utils/is-test-connection-util.js';
import { WinstonLogger } from '../../logging/winston-logger.js';
import { ITableAndViewPermissionData } from '../../permission/permission.interface.js';
import { TableInfoEntity } from '../../table-info/table-info.entity.js';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity.js';
import { FindTablesDs } from '../application/data-structures/find-tables.ds.js';
import { FoundTableDs, FoundTablesWithCategoriesDS } from '../application/data-structures/found-table.ds.js';
import { buildTableFieldInfoEntity, buildTableInfoEntity } from '../utils/save-tables-info-in-database.util.js';
import { IFindTablesInConnectionV2 } from './table-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class FindTablesInConnectionV2UseCase
  extends AbstractUseCase<FindTablesDs, FoundTablesWithCategoriesDS>
  implements IFindTablesInConnectionV2
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private amplitudeService: AmplitudeService,
    private readonly logger: WinstonLogger,
  ) {
    super();
  }

  protected async implementation(inputData: FindTablesDs): Promise<FoundTablesWithCategoriesDS> {
    const { connectionId, hiddenTablesOption, masterPwd, userId } = inputData;
    let connection: ConnectionEntity;
    try {
      connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
    } catch (error) {
      if (error.message === Messages.MASTER_PASSWORD_MISSING) {
        throw new HttpException(
          {
            message: Messages.MASTER_PASSWORD_MISSING,
            type: 'no_master_key',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (error.message === Messages.MASTER_PASSWORD_INCORRECT) {
        throw new HttpException(
          {
            message: Messages.MASTER_PASSWORD_INCORRECT,
            type: 'invalid_master_key',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
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
      Sentry.captureException(e);
      throw new UnknownSQLException(e.message, ExceptionOperations.FAILED_TO_GET_TABLES);
    } finally {
      if (!connection.isTestConnection && tables && tables.length) {
        this.logger.log({
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
        this.saveTableInfoInDatabase(connection.id, userId, tables, masterPwd);
      }
    }
    const tablesWithPermissions = await this.getUserPermissionsForAvailableTables(userId, connectionId, tables);
    const foundConnectionProperties =
      await this._dbContext.connectionPropertiesRepository.findConnectionPropertiesWithTablesCategories(connectionId);
    let tablesRO = await this.addDisplayNamesForTables(connectionId, tablesWithPermissions);
    if (foundConnectionProperties && foundConnectionProperties.hidden_tables.length > 0) {
      if (!hiddenTablesOption) {
        tablesRO = tablesRO.filter((tableRO) => {
          return !foundConnectionProperties.hidden_tables.includes(tableRO.table);
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

    const sortedTables = tablesRO.sort((tableRO1, tableRO2) => {
      const name1 = tableRO1.display_name || tableRO1.table;
      const name2 = tableRO2.display_name || tableRO2.table;
      return name1.localeCompare(name2);
    });

    const tableCategories = foundConnectionProperties?.table_categories || [];

    const responseObject: FoundTablesWithCategoriesDS = {
      tables: sortedTables,
      table_categories: tableCategories.map(({ category_name, category_id, tables, category_color }) => ({
        category_name,
        category_id,
        tables,
        category_color,
      })),
    };
    return responseObject;
  }

  private async addDisplayNamesForTables(
    connectionId: string,
    tablesObjArr: Array<ITableAndViewPermissionData>,
  ): Promise<Array<FoundTableDs>> {
    const tableSettings = await this._dbContext.tableSettingsRepository.findTableSettingsInConnectionPure(connectionId);
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
        tablesAndAccessLevels[table.tableName] = [];
      }
    });
    tables.map((table) => {
      allTablePermissions.map((permission) => {
        if (
          permission.tableName === table.tableName &&
          isObjectPropertyExists(tablesAndAccessLevels, table.tableName)
        ) {
          tablesAndAccessLevels[table.tableName].push(permission.accessLevel);
        }
      });
    });
    const tablesWithPermissions: Array<ITableAndViewPermissionData> = [];
    for (const key in tablesAndAccessLevels) {
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
    return tablesWithPermissions.filter((tableWithPermission: ITableAndViewPermissionData) => {
      return !!tableWithPermission.accessLevel.visibility;
    });
  }

  private async saveTableInfoInDatabase(
    connectionId: string,
    userId: string,
    tables: Array<TableDS>,
    masterPwd: string,
  ): Promise<void> {
    try {
      const foundConnection = await this._dbContext.connectionRepository.findOne({ where: { id: connectionId } });
      if (!foundConnection) {
        return;
      }
      const decryptedConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
        connectionId,
        masterPwd,
      );
      const tableNames: Array<string> = tables.map((table) => table.tableName);
      const queue = new PQueue({ concurrency: 2 });
      const dao = getDataAccessObject(decryptedConnection);
      const tablesStructures: Array<{
        tableName: string;
        structure: Array<TableStructureDS>;
      }> = (await Promise.all(
        tableNames.map(async (tableName) => {
          return await queue.add(async () => {
            const structure = await dao.getTableStructure(tableName, undefined);
            return {
              tableName: tableName,
              structure: structure,
            };
          });
        }),
      )) as Array<{
        tableName: string;
        structure: Array<TableStructureDS>;
      }>;
      foundConnection.tables_info = (await Promise.all(
        tablesStructures.map(async (tableStructure) => {
          return await queue.add(async () => {
            const newTableInfo = buildTableInfoEntity(tableStructure.tableName, foundConnection);
            const savedTableInfo = await this._dbContext.tableInfoRepository.save(newTableInfo);
            const newTableFieldsInfos = tableStructure.structure.map((el) =>
              buildTableFieldInfoEntity(el, savedTableInfo),
            );
            newTableInfo.table_fields_info = await this._dbContext.tableFieldInfoRepository.save(newTableFieldsInfos);
            await this._dbContext.tableInfoRepository.save(newTableInfo);
            return newTableInfo;
          });
        }),
      )) as Array<TableInfoEntity>;
      foundConnection.saved_table_info = ++foundConnection.saved_table_info;
      await this._dbContext.connectionRepository.saveUpdatedConnection(foundConnection);
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
    }
  }
}
