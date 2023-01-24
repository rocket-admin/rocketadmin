import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AccessLevelEnum, AmplitudeEventTypeEnum } from '../../../enums/index.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { AmplitudeService } from '../../amplitude/amplitude.service.js';
import { GroupEntity } from '../../group/group.entity.js';
import { PermissionEntity } from '../../permission/permission.entity.js';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity.js';
import { CreateUserDs } from '../../user/application/data-structures/create-user.ds.js';
import { FindUserDs } from '../../user/application/data-structures/find-user.ds.js';
import { buildConnectionEntitiesFromTestDtos } from '../../user/utils/build-connection-entities-from-test-dtos.js';
import { buildDefaultAdminGroups } from '../../user/utils/build-default-admin-groups.js';
import { buildDefaultAdminPermissions } from '../../user/utils/build-default-admin-permissions.js';
import { buildTestTableSettings } from '../../user/utils/build-test-table-settings.js';
import { FoundConnectionsDs } from '../application/data-structures/found-connections.ds.js';
import { ConnectionEntity } from '../connection.entity.js';
import { buildFoundConnectionDs } from '../utils/build-found-connection.ds.js';
import { IFindConnections } from './use-cases.interfaces.js';

@Injectable()
export class FindAllConnectionsUseCase
  extends AbstractUseCase<CreateUserDs | FindUserDs, FoundConnectionsDs>
  implements IFindConnections
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private amplitudeService: AmplitudeService,
  ) {
    super();
  }

  protected async implementation(userData: CreateUserDs | FindUserDs): Promise<FoundConnectionsDs> {
    const user = await this._dbContext.userRepository.findOneUserById(userData.id);
    if (user) {
      const allFoundUserConnections = await this._dbContext.connectionRepository.findAllUserConnections(user.id);
      const connectionsWithPermissions = await Promise.all(
        allFoundUserConnections.map(async (connection) => {
          const userConnectionAccessLevel = await this._dbContext.userAccessRepository.getUserConnectionAccessLevel(
            user.id,
            connection.id,
          );
          if (userConnectionAccessLevel === AccessLevelEnum.none) {
            for (const key in connection) {
              if (!Constants.CONNECTION_KEYS_NONE_PERMISSION.includes(key)) {
                // eslint-disable-next-line security/detect-object-injection
                delete connection[key];
              }
            }
          }
          if (userConnectionAccessLevel !== AccessLevelEnum.edit) {
            delete connection.signing_key;
          }
          return {
            connection: connection,
            accessLevel: userConnectionAccessLevel,
          };
        }),
      );

      await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.connectionListReceived, user.id);
      return {
        connections: connectionsWithPermissions,
        connectionsCount: connectionsWithPermissions.length,
      };
    } else {
      const savedUser = await this._dbContext.userRepository.createUser(userData);
      const testConnections = Constants.getTestConnectionsArr();
      const testConnectionsEntities = buildConnectionEntitiesFromTestDtos(testConnections);
      const createdTestConnections = await Promise.all(
        testConnectionsEntities.map(async (connection): Promise<ConnectionEntity> => {
          connection.author = savedUser;
          return await this._dbContext.connectionRepository.saveNewConnection(connection);
        }),
      );
      const testGroupsEntities = buildDefaultAdminGroups(savedUser, createdTestConnections);
      const createdTestGroups = await Promise.all(
        testGroupsEntities.map(async (group: GroupEntity) => {
          return await this._dbContext.groupRepository.saveNewOrUpdatedGroup(group);
        }),
      );
      const testPermissionsEntities = buildDefaultAdminPermissions(createdTestGroups);
      await Promise.all(
        testPermissionsEntities.map(async (permission: PermissionEntity) => {
          await this._dbContext.permissionRepository.saveNewOrUpdatedPermission(permission);
        }),
      );
      const testTableSettingsArrays: Array<Array<TableSettingsEntity>> = buildTestTableSettings(createdTestConnections);
      for (const tableSettingsArray of testTableSettingsArrays) {
        await Promise.all(
          tableSettingsArray.map(async (tableSettings: TableSettingsEntity) => {
            await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(tableSettings);
          }),
        );
      }
      await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.userRegistered, savedUser.id);
      const connectionsRO = createdTestConnections.map((connection: ConnectionEntity) => {
        return {
          connection: buildFoundConnectionDs(connection),
          accessLevel: AccessLevelEnum.edit,
        };
      });
      return {
        connections: connectionsRO,
        connectionsCount: connectionsRO.length,
      };
    }
  }
}
