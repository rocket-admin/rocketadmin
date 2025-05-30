import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { ConnectionEntity } from '../../../entities/connection/connection.entity.js';
import { GroupEntity } from '../../../entities/group/group.entity.js';
import { PermissionEntity } from '../../../entities/permission/permission.entity.js';
import { RegisterUserDs } from '../../../entities/user/application/data-structures/register-user-ds.js';
import { ExternalRegistrationProviderEnum } from '../../../entities/user/enums/external-registration-provider.enum.js';
import { UserEntity } from '../../../entities/user/user.entity.js';
import { buildConnectionEntitiesFromTestDtos } from '../../../entities/user/utils/build-connection-entities-from-test-dtos.js';
import { buildDefaultAdminGroups } from '../../../entities/user/utils/build-default-admin-groups.js';
import { buildDefaultAdminPermissions } from '../../../entities/user/utils/build-default-admin-permissions.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { SaasSAMLUserRegisterDS } from '../data-structures/saas-saml-user-register.ds.js';

@Injectable()
export class SaaSRegisterUserWIthSamlUseCase extends AbstractUseCase<SaasSAMLUserRegisterDS, UserEntity> {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(inputData: SaasSAMLUserRegisterDS): Promise<UserEntity> {
    const { email, name, samlNameId } = inputData;
    const foundUser = await this._dbContext.userRepository.findOneUserByEmail(
      email,
      ExternalRegistrationProviderEnum.SAML,
      samlNameId,
    );
    if (foundUser) {
      return foundUser;
    }

    const userData: RegisterUserDs = {
      email: email,
      password: null,
      isActive: true,
      name: name ? name : null,
      gclidValue: null,
    };

    const savedUser = await this._dbContext.userRepository.saveRegisteringUser(
      userData,
      ExternalRegistrationProviderEnum.SAML,
    );

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

    return savedUser;
  }
}
