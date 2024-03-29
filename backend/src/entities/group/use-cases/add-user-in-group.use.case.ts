import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { sendEmailConfirmation, sendInvitationToGroup } from '../../email/send-email.js';
import { PermissionEntity } from '../../permission/permission.entity.js';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity.js';
import { UserEntity } from '../../user/user.entity.js';
import { buildConnectionEntitiesFromTestDtos } from '../../user/utils/build-connection-entities-from-test-dtos.js';
import { buildDefaultAdminGroups } from '../../user/utils/build-default-admin-groups.js';
import { buildDefaultAdminPermissions } from '../../user/utils/build-default-admin-permissions.js';
import { buildTestTableSettings } from '../../user/utils/build-test-table-settings.js';
import { AddUserInGroupDs } from '../application/data-sctructures/add-user-in-group.ds.js';
import { AddedUserInGroupDs } from '../application/data-sctructures/added-user-in-group.ds.js';
import { GroupEntity } from '../group.entity.js';
import { IAddUserInGroup } from './use-cases.interfaces.js';

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
    const foundUser =
      await this._dbContext.userRepository.findUserByEmailEndCompanyIdWithEmailVerificationAndInvitation(email);

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
      const userAlreadyAdded = !!foundGroup.users.find((u) => u.id === foundUser.id);
      let savedInvitation;
      try {
        if (userAlreadyAdded) {
          savedInvitation = await this._dbContext.userInvitationRepository.createOrUpdateInvitationEntity(
            foundUser,
            ownerId,
          );
        } else {
          savedInvitation = await this._dbContext.userInvitationRepository.createOrUpdateInvitationEntity(
            foundUser,
            null,
          );
          foundGroup.users.push(foundUser);
        }
      } catch (e) {
        console.log('ERROR -> ', e);
        throw e;
      }

      const savedGroup = await this._dbContext.groupRepository.saveNewOrUpdatedGroup(foundGroup);
      delete savedGroup.connection;
      const newEmailVerification =
        await this._dbContext.emailVerificationRepository.createOrUpdateEmailVerification(foundUser);

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
      return {
        group: savedGroup,
        message: Messages.USER_ADDED_IN_GROUP(foundUser.email),
        external_invite: false,
      };
    }

    const newUser = new UserEntity();
    newUser.email = email;
    newUser.isActive = false;
    const savedUser = await this._dbContext.userRepository.saveUserEntity(newUser);
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
    const savedInvitation = await this._dbContext.userInvitationRepository.createOrUpdateInvitationEntity(
      savedUser,
      ownerId,
    );
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
    return {
      group: savedGroup,
      message: Messages.USER_EMAIL_NOT_FOUND_AND_INVITED(newUser.email),
      external_invite: true,
    };
  }
}
