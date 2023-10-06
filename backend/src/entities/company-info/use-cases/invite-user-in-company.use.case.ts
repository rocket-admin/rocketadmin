import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { InviteUserInCompanyAndConnectionGroupDs } from '../application/data-structures/invite-user-in-company-and-connection-group.ds.js';
import { IInviteUserInCompanyAndConnectionGroup } from './company-info-use-cases.interface.js';
import { InvitedUserInCompanyAndConnectionGroupDs } from '../application/data-structures/invited-user-in-company-and-connection-group.ds.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { sendInvitationToCompany } from '../../email/send-email.js';
import { Logger } from '../../../helpers/logging/Logger.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';

@Injectable()
export class InviteUserInCompanyAndConnectionGroupUseCase
  extends AbstractUseCase<InviteUserInCompanyAndConnectionGroupDs, InvitedUserInCompanyAndConnectionGroupDs>
  implements IInviteUserInCompanyAndConnectionGroup
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(
    inputData: InviteUserInCompanyAndConnectionGroupDs,
  ): Promise<InvitedUserInCompanyAndConnectionGroupDs> {
    const { inviterId, companyId, groupId, invitedUserEmail, invitedUserCompanyRole } = inputData;
    const foundCompany = await this._dbContext.companyInfoRepository.findOneBy({ id: companyId });
    if (!foundCompany) {
      throw new HttpException(
        {
          message: Messages.COMPANY_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (isSaaS()) {
      const canInviteMoreUsers = await this.saasCompanyGatewayService.canInviteMoreUsers(companyId);
      if (!canInviteMoreUsers) {
        throw new HttpException(
          {
            message: Messages.MAXIMUM_FREE_INVITATION_REACHED_CANNOT_BE_INVITED_IN_COMPANY,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const foundInvitedUser = await this._dbContext.userRepository.findOneUserByEmailAndCompanyId(
      invitedUserEmail,
      companyId,
    );

    if (foundInvitedUser && foundInvitedUser.isActive) {
      throw new HttpException(
        {
          message: Messages.USER_ALREADY_ADDED_IN_COMPANY,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (foundInvitedUser && !foundInvitedUser.isActive) {
      const renewedInvitation = await this._dbContext.invitationInCompanyRepository.createOrUpdateInvitationInCompany(
        foundCompany,
        groupId,
        inviterId,
        invitedUserEmail,
        invitedUserCompanyRole,
      );
      await sendInvitationToCompany(invitedUserEmail, renewedInvitation.verification_string);

      if (!isSaaS()) {
        Logger.printTechString(`Invitation verification string: ${renewedInvitation.verification_string}`);
      } else {
        await this.saasCompanyGatewayService.invitationSentWebhook(
          companyId,
          invitedUserEmail,
          invitedUserCompanyRole,
          inviterId,
          renewedInvitation.verification_string,
        );
      }

      throw new HttpException(
        {
          message: Messages.USER_ALREADY_ADDED_BUT_NOT_ACTIVE_IN_COMPANY,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const newInvitation = await this._dbContext.invitationInCompanyRepository.createOrUpdateInvitationInCompany(
      foundCompany,
      groupId,
      inviterId,
      invitedUserEmail,
      invitedUserCompanyRole,
    );
    await sendInvitationToCompany(invitedUserEmail, newInvitation.verification_string);
    if (isSaaS()) {
      await this.saasCompanyGatewayService.invitationSentWebhook(
        companyId,
        invitedUserEmail,
        invitedUserCompanyRole,
        inviterId,
        newInvitation.verification_string,
      );
    }
    return {
      companyId: companyId,
      groupId: groupId,
      email: invitedUserEmail,
      role: invitedUserCompanyRole,
    };
  }
}
