import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { LoginTicket, OAuth2Client, TokenPayload } from 'google-auth-library';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { GroupEntity } from '../../group/group.entity.js';
import { PermissionEntity } from '../../permission/permission.entity.js';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity.js';
import { GoogleLoginDs } from '../application/data-structures/google-login.ds.js';
import { RegisterUserDs } from '../application/data-structures/register-user-ds.js';
import { RegisteredUserDs } from '../application/data-structures/registered-user.ds.js';
import { UserEntity } from '../user.entity.js';
import { buildConnectionEntitiesFromTestDtos } from '../utils/build-connection-entities-from-test-dtos.js';
import { buildDefaultAdminGroups } from '../utils/build-default-admin-groups.js';
import { buildDefaultAdminPermissions } from '../utils/build-default-admin-permissions.js';
import { buildRegisteredUserDS } from '../utils/build-registered-user.ds.js';
import { buildTestTableSettings } from '../utils/build-test-table-settings.js';
import { generateGwtToken, IToken } from '../utils/generate-gwt-token.js';
import { IGoogleLogin } from './user-use-cases.interfaces.js';

@Injectable()
export class GoogleLoginUseCase extends AbstractUseCase<GoogleLoginDs, IToken> implements IGoogleLogin {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: GoogleLoginDs): Promise<IToken> {
    const { token, glidCookieValue } = inputData;
    const clientId: string = process.env.GOOGLE_CLIENT_ID;
    const client: OAuth2Client = new OAuth2Client(clientId);
    let ticket: LoginTicket;
    try {
      ticket = await client.verifyIdToken({
        idToken: token,
        audience: clientId, // Specify the CLIENT_ID of the app that accesses the backend
      });
    } catch (e) {
      Sentry.captureException(e);
      throw new HttpException(
        {
          message: Messages.GOOGLE_LOGIN_FAILED,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const payload: TokenPayload = ticket.getPayload();
    const { email, email_verified, name } = payload;
    if (!email_verified || !email) {
      throw new HttpException(
        {
          message: Messages.LOGIN_DENIED,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    const foundUser: UserEntity = await this._dbContext.userRepository.findOneUserByEmail(email);
    if (foundUser) {
      if (foundUser.name !== name && name) {
        foundUser.name = name;
        await this._dbContext.userRepository.saveUserEntity(foundUser);
      }
      return generateGwtToken(foundUser);
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

    const registeredUser: RegisteredUserDs = buildRegisteredUserDS(savedUser);
    return registeredUser.token;
  }
}
