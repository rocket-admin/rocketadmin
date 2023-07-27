import axios from 'axios';
import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IToken, generateGwtToken, generateTemporaryJwtToken } from '../utils/generate-gwt-token.js';
import { IAuthGitHub } from './user-use-cases.interfaces.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { Logger } from '../../../helpers/logging/Logger.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { RegisterUserDs } from '../application/data-structures/register-user-ds.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { GroupEntity } from '../../group/group.entity.js';
import { PermissionEntity } from '../../permission/permission.entity.js';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity.js';
import { RegisteredUserDs } from '../application/data-structures/registered-user.ds.js';
import { buildConnectionEntitiesFromTestDtos } from '../utils/build-connection-entities-from-test-dtos.js';
import { buildDefaultAdminGroups } from '../utils/build-default-admin-groups.js';
import { buildDefaultAdminPermissions } from '../utils/build-default-admin-permissions.js';
import { buildRegisteredUserDS } from '../utils/build-registered-user.ds.js';
import { buildTestTableSettings } from '../utils/build-test-table-settings.js';
import { buildUserGitHubIdentifierEntity } from '../utils/build-github-identifier-entity.js';
import { getRequiredEnvVariable } from '../../../helpers/app/get-requeired-env-variable.js';

export class AuthenticateWithGitHubUseCase extends AbstractUseCase<string, IToken> implements IAuthGitHub {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(code: string): Promise<IToken> {
    const gitHubClientId = getRequiredEnvVariable('GIT_HUB_CLIENT_ID');
    const gitHubClientSecret = getRequiredEnvVariable('GIT_HUB_CLIENT_SECRET');
    const redirectUri = `${Constants.APP_DOMAIN_ADDRESS}/api/user/authenticate/github`;
    try {
      const tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: gitHubClientId,
          client_secret: gitHubClientSecret,
          code: code,
          redirect_uri: redirectUri,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      if (tokenResponse.data.error) {
        throw new HttpException(
          {
            message: `${Messages.GITHUB_AUTHENTICATION_FAILED}. Error description: "${tokenResponse.data.error_description}"`,
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const accessToken = tokenResponse.data.access_token;

      const userResponse = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      });

      const { id, name, email } = userResponse.data;

      const foundUser = await this._dbContext.userRepository.findOneUserByGitHubId(Number(id));

      if (foundUser) {
        if (foundUser.isOTPEnabled) {
          return generateTemporaryJwtToken(foundUser);
        }
        return generateGwtToken(foundUser);
      }

      const userData: RegisterUserDs = {
        email: email,
        gclidValue: null,
        password: null,
        isActive: true,
        name: name ? name : null,
      };

      const savedUser = await this._dbContext.userRepository.saveRegisteringUser(userData);
      const newUserGitHubIdentifier = buildUserGitHubIdentifierEntity(savedUser, Number(id));
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
      const testTableSettingsArrays: Array<Array<TableSettingsEntity>> = buildTestTableSettings(createdTestConnections);

      for (const tableSettingsArray of testTableSettingsArrays) {
        await Promise.all(
          tableSettingsArray.map(async (tableSettings: TableSettingsEntity) => {
            await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(tableSettings);
          }),
        );
      }

      const registeredUser: RegisteredUserDs = buildRegisteredUserDS(savedUser);
      return registeredUser.token;
    } catch (error) {
      Logger.logError(error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          message: Messages.GITHUB_AUTHENTICATION_FAILED,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
