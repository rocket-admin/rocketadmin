import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AmplitudeEventTypeEnum } from '../../../enums/index.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { AmplitudeService } from '../../amplitude/amplitude.service.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { GroupEntity } from '../../group/group.entity.js';
import { PermissionEntity } from '../../permission/permission.entity.js';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity.js';
import { CreateUserDs } from '../application/data-structures/create-user.ds.js';
import { FindUserDs } from '../application/data-structures/find-user.ds.js';
import { FoundUserDs } from '../application/data-structures/found-user.ds.js';
import { buildConnectionEntitiesFromTestDtos } from '../utils/build-connection-entities-from-test-dtos.js';
import { buildDefaultAdminGroups } from '../utils/build-default-admin-groups.js';
import { buildDefaultAdminPermissions } from '../utils/build-default-admin-permissions.js';
import { buildFoundUserDs } from '../utils/build-found-user.ds.js';
import { buildTestTableSettings } from '../utils/build-test-table-settings.js';
import { IFindUserUseCase } from './user-use-cases.interfaces.js';

@Injectable()
export class FindUserUseCase
  extends AbstractUseCase<FindUserDs | CreateUserDs, FoundUserDs>
  implements IFindUserUseCase
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly amplitudeService: AmplitudeService,
  ) {
    super();
  }

  protected async implementation(userData: FindUserDs | CreateUserDs): Promise<FoundUserDs> {
    const user = await this._dbContext.userRepository.findOneUserById(userData.id);
    if (user) {
      return await buildFoundUserDs(user);
    }

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
    await Promise.all(
      testTableSettingsArrays.map(async (array: Array<TableSettingsEntity>) => {
        await Promise.all(
          array.map(async (tableSettings: TableSettingsEntity) => {
            await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(tableSettings);
          }),
        );
      }),
    );
    await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.userRegistered, savedUser.id);
    return await buildFoundUserDs(savedUser);
  }
}
