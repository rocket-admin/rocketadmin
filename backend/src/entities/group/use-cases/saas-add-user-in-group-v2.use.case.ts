import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AddUserInGroupWithSaaSDs } from '../application/data-sctructures/add-user-in-group.ds.js';
import { AddedUserInGroupDs } from '../application/data-sctructures/added-user-in-group.ds.js';
import { IAddUserInGroup } from './use-cases.interfaces.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { UserEntity } from '../../user/user.entity.js';
import { sendEmailConfirmation, sendInvitationToGroup } from '../../email/send-email.js';
import { UserInvitationEntity } from '../../user/user-invitation/user-invitation.entity.js';

export class SaaSAddUserInGroupV2UseCase
  extends AbstractUseCase<AddUserInGroupWithSaaSDs, AddedUserInGroupDs>
  implements IAddUserInGroup
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(inputData: AddUserInGroupWithSaaSDs): Promise<AddedUserInGroupDs> {
    const { email, groupId, inviterId } = inputData;
    const foundGroup = await this._dbContext.groupRepository.findGroupById(groupId);
    const foundConnection =
      await this._dbContext.connectionRepository.getConnectionByGroupIdWithCompanyAndUsersInCompany(groupId);
    if (!foundConnection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  
    if (!foundConnection.company) {
      throw new HttpException(
        {
          message: Messages.COMPANY_NOT_EXISTS_IN_CONNECTION,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const foundUser =
      await this._dbContext.userRepository.findUserByEmailEndCompanyIdWithEmailVerificationAndInvitation(
        email,
        foundConnection.company.id,
      );

    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_INVITED_IN_COMPANY(email),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const isUserInCompany = this.isUserAlreadyInCompany(foundConnection, foundUser);
    const canInviteMoreUsers = await this.saasCompanyGatewayService.canInviteMoreUsers(foundConnection.company.id);
    if (!canInviteMoreUsers && !isUserInCompany) {
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
      return {
        group: savedGroup,
        message: Messages.USER_ADDED_IN_GROUP(foundUser.email),
        external_invite: false,
      };
    }

    if (foundUser && !foundUser.isActive) {
      const userAlreadyAdded = !!foundGroup.users.find((u) => u.id === foundUser.id);
      let savedInvitation: UserInvitationEntity;
      if (userAlreadyAdded) {
        savedInvitation = await this._dbContext.userInvitationRepository.createOrUpdateInvitationEntity(
          foundUser,
          inviterId,
        );
      } else {
        savedInvitation = await this._dbContext.userInvitationRepository.createOrUpdateInvitationEntity(
          foundUser,
          null,
        );
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
      return {
        group: savedGroup,
        message: Messages.USER_ADDED_IN_GROUP(foundUser.email),
        external_invite: false,
      };
    }
  }

  private isUserAlreadyInCompany(connectionWithCompanyAndUsers: ConnectionEntity, foundUser: UserEntity): boolean {
    if (
      !connectionWithCompanyAndUsers.company ||
      !connectionWithCompanyAndUsers.company.users ||
      !connectionWithCompanyAndUsers.company.users.length ||
      !foundUser
    ) {
      return false;
    }
    const foundUserInCompany = connectionWithCompanyAndUsers.company.users.find((u) => u.id === foundUser.id);
    return !!foundUserInCompany;
  }
}
