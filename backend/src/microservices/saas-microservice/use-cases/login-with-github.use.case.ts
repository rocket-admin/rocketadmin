import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { ConnectionEntity } from '../../../entities/connection/connection.entity.js';
import { GroupEntity } from '../../../entities/group/group.entity.js';
import { PermissionEntity } from '../../../entities/permission/permission.entity.js';
import { RegisterUserDs } from '../../../entities/user/application/data-structures/register-user-ds.js';
import { ExternalRegistrationProviderEnum } from '../../../entities/user/enums/external-registration-provider.enum.js';
import { UserRoleEnum } from '../../../entities/user/enums/user-role.enum.js';
import { UserEntity } from '../../../entities/user/user.entity.js';
import { buildConnectionEntitiesFromTestDtos } from '../../../entities/user/utils/build-connection-entities-from-test-dtos.js';
import { buildDefaultAdminGroups } from '../../../entities/user/utils/build-default-admin-groups.js';
import { buildDefaultAdminPermissions } from '../../../entities/user/utils/build-default-admin-permissions.js';
import { buildUserGitHubIdentifierEntity } from '../../../entities/user/utils/build-github-identifier-entity.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { SaasRegisterUserWithGithub } from '../data-structures/saas-register-user-with-github.js';
import { ILoginUserWithGitHub } from './saas-use-cases.interface.js';

@Injectable()
export class LoginUserWithGithubUseCase
  extends AbstractUseCase<SaasRegisterUserWithGithub, UserEntity>
  implements ILoginUserWithGitHub
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: SaasRegisterUserWithGithub): Promise<UserEntity> {
    const { email, githubId, glidCookieValue, name } = inputData;
    const foundUser: UserEntity = await this._dbContext.userRepository.findOneUserByGitHubId(githubId);
    if (foundUser) {
      if (foundUser.name !== name && name) {
        foundUser.name = name;
      }
      if (foundUser.email !== email) {
        foundUser.email = email;
      }
      await this._dbContext.userRepository.saveUserEntity(foundUser);
      return foundUser;
    }
    const userData: RegisterUserDs = {
      email: email,
      gclidValue: glidCookieValue,
      password: null,
      isActive: true,
      name: name ? name : null,
      role: UserRoleEnum.ADMIN,
    };

    try {
      const savedUser = await this._dbContext.userRepository.saveRegisteringUser(
        userData,
        ExternalRegistrationProviderEnum.GITHUB,
      );

      const newUserGitHubIdentifier = buildUserGitHubIdentifierEntity(savedUser, Number(githubId));
      await this._dbContext.userGitHubIdentifierRepository.saveGitHubIdentifierEntity(newUserGitHubIdentifier);

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
    } catch (_e) {
      throw new InternalServerErrorException(Messages.GITHUB_REGISTRATION_FAILED);
    }
  }
}
