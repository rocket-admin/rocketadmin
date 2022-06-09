import * as Sentry from '@sentry/node';
import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { IGoogleLogin } from './user-use-cases.interfaces';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { LoginTicket, OAuth2Client, TokenPayload } from 'google-auth-library';
import { Messages } from '../../../exceptions/text/messages';
import { generateGwtToken, IToken } from '../utils/generate-gwt-token';
import { UserEntity } from '../user.entity';
import { RegisterUserDs } from '../application/data-structures/register-user-ds';
import { Constants } from '../../../helpers/constants/constants';
import { buildConnectionEntitiesFromTestDtos } from '../utils/build-connection-entities-from-test-dtos';
import { ConnectionEntity } from '../../connection/connection.entity';
import { buildDefaultAdminGroups } from '../utils/build-default-admin-groups';
import { GroupEntity } from '../../group/group.entity';
import { buildDefaultAdminPermissions } from '../utils/build-default-admin-permissions';
import { PermissionEntity } from '../../permission/permission.entity';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity';
import { buildTestTableSettings } from '../utils/build-test-table-settings';
import { buildRegisteredUserDS } from '../utils/build-registered-user.ds';
import { RegisteredUserDs } from '../application/data-structures/registered-user.ds';
import { GoogleLoginDs } from '../application/data-structures/google-login.ds';
import AbstractUseCase from '../../../common/abstract-use.case';

@Injectable({ scope: Scope.REQUEST })
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
    const { email, email_verified } = payload;
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
      return generateGwtToken(foundUser);
    }
    const userData: RegisterUserDs = {
      email: email,
      gclidValue: glidCookieValue,
      password: null,
      isActive: true,
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
    await Promise.all(
      testTableSettingsArrays.map(async (array: Array<TableSettingsEntity>) => {
        await Promise.all(
          array.map(async (tableSettings: TableSettingsEntity) => {
            await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(tableSettings);
          }),
        );
      }),
    );
    const registeredUser: RegisteredUserDs = buildRegisteredUserDS(savedUser);
    return registeredUser.token;
  }
}
