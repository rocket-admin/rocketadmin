import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { Messages } from '../../../exceptions/text/messages';
import { Constants } from '../../../helpers/constants/constants';
import { ConnectionEntity } from '../../connection/connection.entity';
import { GroupEntity } from '../../group/group.entity';
import { PermissionEntity } from '../../permission/permission.entity';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity';
import { RegisterUserDs } from '../application/data-structures/register-user-ds';
import { RegisteredUserDs } from '../application/data-structures/registered-user.ds';
import { UserEntity } from '../user.entity';
import { buildConnectionEntitiesFromTestDtos } from '../utils/build-connection-entities-from-test-dtos';
import { buildDefaultAdminGroups } from '../utils/build-default-admin-groups';
import { buildDefaultAdminPermissions } from '../utils/build-default-admin-permissions';
import { buildRegisteredUserDS } from '../utils/build-registered-user.ds';
import { buildTestTableSettings } from '../utils/build-test-table-settings';
import { generateGwtToken, IToken } from '../utils/generate-gwt-token';
import { IFacebookLogin } from './user-use-cases.interfaces';

@Injectable()
export class FacebookLoginUseCase extends AbstractUseCase<string, IToken> implements IFacebookLogin {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(facebookAccessToken: string): Promise<IToken> {
    const faceBookGraphApiUrl = `https://graph.facebook.com/me?access_token=${facebookAccessToken}&fields=email,name`;
    try {
      const response = await axios.get(faceBookGraphApiUrl);
      const email = response.data.email;
      const userName = response.data.name ? response.data.name : null;
      if (!email) {
        throw Error('There no email address in user info from facebook');
      }
      const foundUser: UserEntity = await this._dbContext.userRepository.findOneUserByEmail(email);
      if (foundUser) {
        if (foundUser.name !== userName && userName) {
          foundUser.name = userName;
          await this._dbContext.userRepository.saveUserEntity(foundUser);
        }
        return generateGwtToken(foundUser);
      }
      const userData: RegisterUserDs = {
        email: email,
        gclidValue: null,
        password: null,
        isActive: true,
        name: userName,
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
    } catch (e) {
      console.error('-> e', e);
      throw new HttpException(
        {
          message: Messages.LOGIN_DENIED,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
