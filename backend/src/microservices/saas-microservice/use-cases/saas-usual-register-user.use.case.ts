import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { FoundUserDs } from '../../../entities/user/application/data-structures/found-user.ds.js';
import { SaasUsualUserRegisterDS } from '../../../entities/user/application/data-structures/usual-register-user.ds.js';
import { TableSettingsEntity } from '../../../entities/table-settings/table-settings.entity.js';
import assert from 'assert';
import { ConnectionEntity } from '../../../entities/connection/connection.entity.js';
import { sendEmailConfirmation } from '../../../entities/email/send-email.js';
import { GroupEntity } from '../../../entities/group/group.entity.js';
import { PermissionEntity } from '../../../entities/permission/permission.entity.js';
import { RegisterUserDs } from '../../../entities/user/application/data-structures/register-user-ds.js';
import { buildConnectionEntitiesFromTestDtos } from '../../../entities/user/utils/build-connection-entities-from-test-dtos.js';
import { buildDefaultAdminGroups } from '../../../entities/user/utils/build-default-admin-groups.js';
import { buildDefaultAdminPermissions } from '../../../entities/user/utils/build-default-admin-permissions.js';
import { buildTestTableSettings } from '../../../entities/user/utils/build-test-table-settings.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { ValidationHelper } from '../../../helpers/validators/validation-helper.js';
import { ISaasRegisterUser } from './saas-use-cases.interface.js';

export class SaasUsualRegisterUseCase
  extends AbstractUseCase<SaasUsualUserRegisterDS, FoundUserDs>
  implements ISaasRegisterUser
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(userData: SaasUsualUserRegisterDS): Promise<FoundUserDs> {
    const { email, password, gclidValue, name, companyId } = userData;
    ValidationHelper.isPasswordStrongOrThrowError(password);
    const foundUser = await this._dbContext.userRepository.findOneUserByEmailAndCompanyId(email, companyId);
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
    return {
      id: savedUser.id,
      createdAt: savedUser.createdAt,
      isActive: savedUser.isActive,
      email: savedUser.email,
      portal_link: null,
      subscriptionLevel: null,
      intercom_hash: null,
      name: savedUser.name,
      is_2fa_enabled: false,
    };
  }
}
