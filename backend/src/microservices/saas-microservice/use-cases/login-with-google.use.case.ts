import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { ConnectionEntity } from '../../../entities/connection/connection.entity.js';
import { GroupEntity } from '../../../entities/group/group.entity.js';
import { PermissionEntity } from '../../../entities/permission/permission.entity.js';
import { TableSettingsEntity } from '../../../entities/table-settings/table-settings.entity.js';
import { RegisterUserDs } from '../../../entities/user/application/data-structures/register-user-ds.js';
import { UserEntity } from '../../../entities/user/user.entity.js';
import { buildConnectionEntitiesFromTestDtos } from '../../../entities/user/utils/build-connection-entities-from-test-dtos.js';
import { buildDefaultAdminGroups } from '../../../entities/user/utils/build-default-admin-groups.js';
import { buildDefaultAdminPermissions } from '../../../entities/user/utils/build-default-admin-permissions.js';
import { buildTestTableSettings } from '../../../entities/user/utils/build-test-table-settings.js';
import { ILoginUserWithGoogle } from './saas-use-cases.interface.js';
import { SaasRegisterUserWithGoogleDS } from '../data-structures/sass-register-user-with-google.js';

@Injectable()
export class LoginWithGoogleUseCase
  extends AbstractUseCase<SaasRegisterUserWithGoogleDS, UserEntity>
  implements ILoginUserWithGoogle
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: SaasRegisterUserWithGoogleDS): Promise<UserEntity> {
    const { email, name, glidCookieValue } = inputData;

    const foundUser: UserEntity = await this._dbContext.userRepository.findOneUserByEmail(email);
    if (foundUser) {
      if (foundUser.name !== name && name) {
        foundUser.name = name;
        await this._dbContext.userRepository.saveUserEntity(foundUser);
      }
      return foundUser;
    }
    const userData: RegisterUserDs = {
      email: email,
      gclidValue: glidCookieValue,
      password: null,
      isActive: true,
      name: name ? name : null,
    };
    const savedUser = await this._dbContext.userRepository.saveRegisteringUser(userData);
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

    return savedUser;
  }
}
