import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AddUserInGroupWithSaaSDs } from '../application/data-sctructures/add-user-in-group.ds.js';
import { AddedUserInGroupDs } from '../application/data-sctructures/added-user-in-group.ds.js';
import { IAddUserInGroup } from './use-cases.interfaces.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { sendEmailConfirmation, sendInvitationToGroup } from '../../email/send-email.js';
import { UserInvitationEntity } from '../../user/user-invitation/user-invitation.entity.js';
import { buildFoundGroupResponseDto } from '../utils/biuld-found-group-response.dto.js';
import { slackPostMessage } from '../../../helpers/index.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';

export class AddUserInGroupUseCase
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
    const foundGroup = await this._dbContext.groupRepository.findGroupByIdWithConnectionAndUsers(groupId);

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

    if (!foundConnection.company || !foundConnection.company.id) {
      throw new HttpException(
        {
          message: Messages.COMPANY_NOT_EXISTS_IN_CONNECTION,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const companyWithUsers = await this._dbContext.companyInfoRepository.findCompanyInfoWithUsersById(
      foundConnection.company.id,
    );

    if (!companyWithUsers) {
      throw new HttpException(
        {
          message: Messages.COMPANY_NOT_EXISTS_IN_CONNECTION,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const foundUser = companyWithUsers.users.find((u) => u.email === email);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_INVITED_IN_COMPANY(email),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    //todo remove in future
    if (isSaaS()) {
      const saasFoundCompany = await this.saasCompanyGatewayService.getCompanyInfo(foundConnection.company.id);
      const saasFoundUserInCompany = saasFoundCompany?.users.find((u) => u.email === email);

      if (foundUser && !saasFoundUserInCompany) {
        await slackPostMessage('probable desynchronization of users (adding a user to a group)');
      }
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
      return {
        group: buildFoundGroupResponseDto(savedGroup),
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
        group: buildFoundGroupResponseDto(savedGroup),
        message: Messages.USER_ADDED_IN_GROUP(foundUser.email),
        external_invite: false,
      };
    }
  }
}
