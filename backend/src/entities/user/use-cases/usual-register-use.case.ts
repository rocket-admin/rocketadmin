import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IUsualRegister } from './user-use-cases.interfaces';
import { UsualLoginDs } from '../application/data-structures/usual-login.ds';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
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
import { generateGwtToken, IToken } from '../utils/generate-gwt-token';
import { sendEmailConfirmation } from '../../email/send-email';
import { Messages } from '../../../exceptions/text/messages';

@Injectable({ scope: Scope.REQUEST })
export class UsualRegisterUseCase extends AbstractUseCase<UsualLoginDs, IToken> implements IUsualRegister {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(userData: UsualLoginDs): Promise<IToken> {
    const { email, password, gclidValue } = userData;
    const foundUser = await this._dbContext.userRepository.findOneUserByEmail(email);
    if (foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_ALREADY_REGISTERED(email),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const registerUserData: RegisterUserDs = {
      email: email,
      password: password,
      isActive: false,
      gclidValue: gclidValue,
    };
    const savedUser = await this._dbContext.userRepository.saveRegisteringUser(registerUserData);
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
    const createdEmailVerification = await this._dbContext.emailVerificationRepository.createOrUpdateEmailVerification(
      savedUser,
    );
    await sendEmailConfirmation(savedUser.email, createdEmailVerification.verification_string);
    return generateGwtToken(savedUser);
  }
}
