import { Inject, Injectable } from '@nestjs/common';
import { IGlobalDatabaseContext } from '../../common/application/global-database-context.interface.js';
import { BaseType } from '../../common/data-injection.tokens.js';
import { Constants } from '../../helpers/constants/constants.js';
import { buildConnectionEntitiesFromTestDtos } from '../user/utils/build-connection-entities-from-test-dtos.js';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { buildDefaultAdminGroups } from '../user/utils/build-default-admin-groups.js';
import { GroupEntity } from '../group/group.entity.js';
import { buildDefaultAdminPermissions } from '../user/utils/build-default-admin-permissions.js';
import { PermissionEntity } from '../permission/permission.entity.js';

@Injectable()
export class DemoDataService {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {}

  public async createDemoDataForUser(userId: string): Promise<Array<ConnectionEntity>> {
    const foundUser = await this._dbContext.userRepository.findOne({
      where: { id: userId },
    });

    if (!foundUser) {
      throw new Error(`Unexpected error in demo data creation: User with ID ${userId} not found.`);
    }

    const testConnections = Constants.getTestConnectionsArr();
    const testConnectionsEntities = buildConnectionEntitiesFromTestDtos(testConnections);
    const createdTestConnections = await Promise.all(
      testConnectionsEntities.map(async (connection): Promise<ConnectionEntity> => {
        connection.author = foundUser;
        return await this._dbContext.connectionRepository.saveNewConnection(connection);
      }),
    );
    const testGroupsEntities = buildDefaultAdminGroups(foundUser, createdTestConnections);
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

    return createdTestConnections;
  }
}
