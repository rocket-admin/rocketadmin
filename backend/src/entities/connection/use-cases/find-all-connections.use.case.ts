import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AccessLevelEnum, AmplitudeEventTypeEnum } from '../../../enums/index.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { AmplitudeService } from '../../amplitude/amplitude.service.js';
import { CreateUserDs } from '../../user/application/data-structures/create-user.ds.js';
import { FindUserDs } from '../../user/application/data-structures/find-user.ds.js';
import { FoundConnectionsDs } from '../application/data-structures/found-connections.ds.js';
import { IFindConnections } from './use-cases.interfaces.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { ConnectionEntity } from '../connection.entity.js';
import { buildFoundConnectionDs } from '../utils/build-found-connection.ds.js';
import { buildConnectionEntitiesFromTestDtos } from '../../user/utils/build-connection-entities-from-test-dtos.js';
import { GroupEntity } from '../../group/group.entity.js';
import { PermissionEntity } from '../../permission/permission.entity.js';
import { buildDefaultAdminGroups } from '../../user/utils/build-default-admin-groups.js';
import { buildDefaultAdminPermissions } from '../../user/utils/build-default-admin-permissions.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';

export type RequiredConnectionKeys = Pick<ConnectionEntity, 'id' | 'database' | 'isTestConnection'>;
export type OptionalConnectionKeys = Partial<Omit<ConnectionEntity, keyof RequiredConnectionKeys>>;
export type FilteredConnection = RequiredConnectionKeys & OptionalConnectionKeys;

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
    if (!user) {
      throw new InternalServerErrorException(Messages.USER_NOT_FOUND);
    }
    const allFoundUserConnections = await this._dbContext.connectionRepository.findAllUserConnections(user.id, false);

    if (user.showTestConnections && isSaaS()) {
      let allFoundUserTestConnections = await this._dbContext.connectionRepository.findAllUserTestConnections(user.id);
      const availableTestConnections = Constants.getTestConnectionsArr();
      if (allFoundUserTestConnections.length < availableTestConnections.length) {
        const missingTestConnections = availableTestConnections.filter(
          (testConnection) =>
            !allFoundUserTestConnections.some((foundConnection) => foundConnection.type === testConnection.type),
        );
        const testConnectionsEntities = buildConnectionEntitiesFromTestDtos(missingTestConnections);
        const createdTestConnections = await Promise.all(
          testConnectionsEntities.map(async (connection): Promise<ConnectionEntity> => {
            connection.author = user;
            return await this._dbContext.connectionRepository.saveNewConnection(connection);
          }),
        );
        const testGroupsEntities = buildDefaultAdminGroups(user, createdTestConnections);
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
        allFoundUserTestConnections.push(...createdTestConnections);
      }
      if (allFoundUserTestConnections.length > availableTestConnections.length) {
        const testConnectionsToDelete = allFoundUserTestConnections.filter(
          (foundConnection) =>
            !availableTestConnections.some((testConnection) => testConnection.type === foundConnection.type),
        );
        await Promise.all(
          testConnectionsToDelete.map(async (connection) => {
            await this._dbContext.connectionRepository.remove(connection);
          }),
        );
        allFoundUserTestConnections = allFoundUserTestConnections.filter((foundConnection) =>
          availableTestConnections.some((testConnection) => testConnection.type === foundConnection.type),
        );
      }
      allFoundUserConnections.push(...allFoundUserTestConnections);
    }

    const filterConnectionKeys = (connection: ConnectionEntity, allowedKeys: Array<string>): FilteredConnection => {
      return Object.keys(connection).reduce((acc, key) => {
        if (allowedKeys.includes(key)) {
          // eslint-disable-next-line security/detect-object-injection
          acc[key] = connection[key];
        }
        return acc;
      }, {} as FilteredConnection);
    };

    const connectionsWithPermissions = await Promise.all(
      allFoundUserConnections.map(async (connection) => {
        const accessLevel = await this._dbContext.userAccessRepository.getUserConnectionAccessLevel(
          user.id,
          connection.id,
        );
        let filteredConnection: FilteredConnection = connection;

        if (accessLevel === AccessLevelEnum.none) {
          filteredConnection = filterConnectionKeys(connection, Constants.CONNECTION_KEYS_NONE_PERMISSION);
        } else if (accessLevel !== AccessLevelEnum.edit) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { signing_key, ...rest } = connection;
          filteredConnection = rest;
        }

        return {
          connection: buildFoundConnectionDs(filteredConnection),
          accessLevel: accessLevel,
        };
      }),
    );

    await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.connectionListReceived, user.id);
    return {
      connections: connectionsWithPermissions,
      connectionsCount: connectionsWithPermissions.length,
    };
  }
}
