import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import assert from 'assert';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { ValidationHelper } from '../../../helpers/validators/validation-helper.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { sendEmailConfirmation } from '../../email/send-email.js';
import { GroupEntity } from '../../group/group.entity.js';
import { PermissionEntity } from '../../permission/permission.entity.js';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity.js';
import { RegisterUserDs } from '../application/data-structures/register-user-ds.js';
import { UsualLoginDs } from '../application/data-structures/usual-login.ds.js';
import { UsualRegisterUserDs } from '../application/data-structures/usual-register-user.ds.js';
import { buildConnectionEntitiesFromTestDtos } from '../utils/build-connection-entities-from-test-dtos.js';
import { buildDefaultAdminGroups } from '../utils/build-default-admin-groups.js';
import { buildDefaultAdminPermissions } from '../utils/build-default-admin-permissions.js';
import { buildTestTableSettings } from '../utils/build-test-table-settings.js';
import { generateGwtToken, IToken } from '../utils/generate-gwt-token.js';
import { IUsualRegister } from './user-use-cases.interfaces.js';

@Injectable()
export class UsualRegisterUseCase extends AbstractUseCase<UsualLoginDs, IToken> implements IUsualRegister {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(userData: UsualRegisterUserDs): Promise<IToken> {
    const { email, password, gclidValue, name } = userData;
    ValidationHelper.isPasswordStrongOrThrowError(password);
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
      name: name,
    };
    const savedUser = await this._dbContext.userRepository.saveRegisteringUser(registerUserData);
    const testConnections = Constants.getTestConnectionsArr();
    const testConnectionsEntities = buildConnectionEntitiesFromTestDtos(testConnections);
    const createdTestConnections = await Promise.all(
      testConnectionsEntities.map(async (connection): Promise<ConnectionEntity> => {
        assert(savedUser.id, 'User should be saved before creating connections');
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
    const createdEmailVerification = await this._dbContext.emailVerificationRepository.createOrUpdateEmailVerification(
      savedUser,
    );
    await sendEmailConfirmation(savedUser.email, createdEmailVerification.verification_string);
    return generateGwtToken(savedUser);
  }
}
