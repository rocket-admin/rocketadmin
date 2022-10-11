import AbstractUseCase from '../../../common/abstract-use.case';
import { AddUserInGroupDs } from '../application/data-sctructures/add-user-in-group.ds';
import { IAddUserInGroup } from './use-cases.interfaces';
import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { Messages } from '../../../exceptions/text/messages';
import { UserEntity } from '../../user/user.entity';
import { sendEmailConfirmation, sendInvitationToGroup } from '../../email/send-email';
import { AddedUserInGroupDs } from '../application/data-sctructures/added-user-in-group.ds';
import { StripeUtil } from '../../user/utils/stripe-util';
import { Constants } from '../../../helpers/constants/constants';
import { buildConnectionEntitiesFromTestDtos } from '../../user/utils/build-connection-entities-from-test-dtos';
import { ConnectionEntity } from '../../connection/connection.entity';
import { buildDefaultAdminGroups } from '../../user/utils/build-default-admin-groups';
import { GroupEntity } from '../group.entity';
import { buildDefaultAdminPermissions } from '../../user/utils/build-default-admin-permissions';
import { PermissionEntity } from '../../permission/permission.entity';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity';
import { buildTestTableSettings } from '../../user/utils/build-test-table-settings';

@Injectable()
export class AddUserInGroupUseCase
  extends AbstractUseCase<AddUserInGroupDs, AddedUserInGroupDs>
  implements IAddUserInGroup
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: AddUserInGroupDs): Promise<AddedUserInGroupDs> {
    const { email, groupId } = inputData;
    const foundGroup = await this._dbContext.groupRepository.findGroupById(groupId);
    const foundUser = await this._dbContext.userRepository.findUserByEmailWithEmailVerificationAndInvitation(email);

    if (foundUser && foundUser.isActive) {
      const userAlreadyAdded = !!foundGroup.users.find((u) => u.id === foundUser.id);
      if (userAlreadyAdded) {
        throw new HttpException(
          {
            message: Messages.USER_ALREADY_ADDED,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      foundGroup.users.push(foundUser);
      const savedGroup = await this._dbContext.groupRepository.saveNewOrUpdatedGroup(foundGroup);
      delete savedGroup.connection;
      return {
        group: savedGroup,
        message: Messages.USER_ADDED_IN_GROUP(foundUser.email),
        external_invite: false,
      };
    }

    if (foundUser && !foundUser.isActive) {
      const savedInvitation = await this._dbContext.userInvitationRepository.createOrUpdateInvitationEntity(foundUser);
      const userAlreadyAdded = !!foundGroup.users.find((u) => u.id === foundUser.id);
      if (!userAlreadyAdded) {
        foundGroup.users.push(foundUser);
      }
      const savedGroup = await this._dbContext.groupRepository.saveNewOrUpdatedGroup(foundGroup);
      delete savedGroup.connection;
      const newEmailVerification = await this._dbContext.emailVerificationRepository.createOrUpdateEmailVerification(
        foundUser,
      );
      await sendEmailConfirmation(foundUser.email, newEmailVerification.verification_string);
      await sendInvitationToGroup(foundUser.email, savedInvitation.verification_string);
      if (userAlreadyAdded) {
        throw new HttpException(
          {
            message: Messages.USER_ALREADY_ADDED_BUT_NOT_ACTIVE,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      return {
        group: savedGroup,
        message: Messages.USER_ADDED_IN_GROUP(foundUser.email),
        external_invite: false,
      };
    }

    const newUser = new UserEntity();
    newUser.email = email;
    newUser.isActive = false;
    let savedUser = await this._dbContext.userRepository.saveUserEntity(newUser);
    if (savedUser && process.env.NODE_ENV !== 'test') {
      savedUser.stripeId = await StripeUtil.createUserStripeCustomerAndReturnStripeId(savedUser.id);
      savedUser = await this._dbContext.userRepository.saveUserEntity(newUser);
    }
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
    const savedInvitation = await this._dbContext.userInvitationRepository.createOrUpdateInvitationEntity(savedUser);
    foundGroup.users.push(newUser);
    const savedGroup = await this._dbContext.groupRepository.saveNewOrUpdatedGroup(foundGroup);
    delete savedGroup.connection;
    await sendInvitationToGroup(savedUser.email, savedInvitation.verification_string);
    return {
      group: savedGroup,
      message: Messages.USER_EMAIL_NOT_FOUND_AND_INVITED(newUser.email),
      external_invite: true,
    };
  }
}
