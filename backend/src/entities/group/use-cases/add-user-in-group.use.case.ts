import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { SubscriptionLevelEnum } from '../../../enums';
import { Messages } from '../../../exceptions/text/messages';
import { Constants } from '../../../helpers/constants/constants';
import { ConnectionEntity } from '../../connection/connection.entity';
import { sendEmailConfirmation, sendInvitationToGroup } from '../../email/send-email';
import { PermissionEntity } from '../../permission/permission.entity';
import { createStripeUsageRecord } from '../../stripe/stripe-helpers/create-stripe-usage-record';
import { getCurrentUserSubscription } from '../../stripe/stripe-helpers/get-current-user-subscription';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity';
import { UserEntity } from '../../user/user.entity';
import { buildConnectionEntitiesFromTestDtos } from '../../user/utils/build-connection-entities-from-test-dtos';
import { buildDefaultAdminGroups } from '../../user/utils/build-default-admin-groups';
import { buildDefaultAdminPermissions } from '../../user/utils/build-default-admin-permissions';
import { buildTestTableSettings } from '../../user/utils/build-test-table-settings';
import { AddUserInGroupDs } from '../application/data-sctructures/add-user-in-group.ds';
import { AddedUserInGroupDs } from '../application/data-sctructures/added-user-in-group.ds';
import { GroupEntity } from '../group.entity';
import { IAddUserInGroup } from './use-cases.interfaces';

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
    const ownerId = await this._dbContext.connectionRepository.getConnectionAuthorIdByGroupInConnectionId(groupId);
    const foundGroup = await this._dbContext.groupRepository.findGroupById(groupId);
    const foundUser = await this._dbContext.userRepository.findUserByEmailWithEmailVerificationAndInvitation(email);
    const foundOwner = await this._dbContext.userRepository.findOneUserById(ownerId);
    let usersInConnectionsCount = await this.calculateUsersInAllConnectionsOfThisOwner(ownerId);
    const ownerSubscriptionLevel: SubscriptionLevelEnum = await getCurrentUserSubscription(foundOwner.stripeId);
    const canInviteMoreUsers = await this.checkInvateAbylity(ownerId, usersInConnectionsCount);
    ++usersInConnectionsCount;
    if (!canInviteMoreUsers) {
      throw new HttpException(
        {
          message: Messages.MAXIMUM_FREE_INVITATION_REACHED,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

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
      await createStripeUsageRecord(ownerSubscriptionLevel, usersInConnectionsCount);
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

      const confiramtionMailResult = await sendEmailConfirmation(
        foundUser.email,
        newEmailVerification.verification_string,
      );

      if (confiramtionMailResult?.rejected.includes(foundUser.email)) {
        throw new HttpException(
          {
            message: Messages.FAILED_TO_SEND_CONFIRMATION_EMAIL(foundUser.email),
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const invitationMailResult = await sendInvitationToGroup(foundUser.email, savedInvitation.verification_string);

      if (invitationMailResult?.rejected.includes(foundUser.email)) {
        throw new HttpException(
          {
            message: Messages.FAILED_TO_SEND_INVITATION_EMAIL(foundUser.email),
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (userAlreadyAdded) {
        throw new HttpException(
          {
            message: Messages.USER_ALREADY_ADDED_BUT_NOT_ACTIVE,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      await createStripeUsageRecord(ownerSubscriptionLevel, usersInConnectionsCount);
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
    const mailResult = await sendInvitationToGroup(savedUser.email, savedInvitation.verification_string);
    if (mailResult?.rejected.includes(savedUser.email)) {
      throw new HttpException(
        {
          message: Messages.FAILED_TO_SEND_INVITATION_EMAIL(savedUser.email),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    await createStripeUsageRecord(ownerSubscriptionLevel, usersInConnectionsCount);
    return {
      group: savedGroup,
      message: Messages.USER_EMAIL_NOT_FOUND_AND_INVITED(newUser.email),
      external_invite: true,
    };
  }

  private async calculateUsersInAllConnectionsOfThisOwner(connectionOwnerId: string): Promise<number> {
    const allUserConnections = await this._dbContext.connectionRepository.findAllNonTestsConnectionsWhereUserIsOwner(
      connectionOwnerId,
    );
    const testConnectionsHosts = Constants.getTestConnectionsHostNamesArr();
    const filteredNonTestConnections = allUserConnections.filter((connection: ConnectionEntity) => {
      return !testConnectionsHosts.includes(connection.host);
    });
    const allUserInAllGroupsInThisConnections: Array<Array<UserEntity>> = await Promise.all(
      filteredNonTestConnections.map(async (connection: ConnectionEntity) => {
        return await this._dbContext.connectionRepository.findAllUsersInConnection(connection.id);
      }),
    );

    const allUserArray = allUserInAllGroupsInThisConnections.flat();
    const filteredUsers = [...new Map(allUserArray.map((user) => [user['id'], user])).values()];
    return filteredUsers.length;
  }

  private async checkInvateAbylity(ownerId: string, usersCount: number): Promise<boolean> {
    if (usersCount < 3) {
      return true;
    }
    const foundOwner = await this._dbContext.userRepository.findOneUserById(ownerId);
    if (!foundOwner.stripeId) {
      return false;
    }

    const ownerSubscription = await getCurrentUserSubscription(foundOwner.stripeId);
    if (ownerSubscription === SubscriptionLevelEnum.FREE_PLAN) {
      return false;
    }
    return true;
  }
}
