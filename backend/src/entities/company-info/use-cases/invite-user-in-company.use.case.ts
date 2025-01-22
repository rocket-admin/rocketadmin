import { Injectable, Inject, HttpException, HttpStatus, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { InviteUserInCompanyAndConnectionGroupDs } from '../application/data-structures/invite-user-in-company-and-connection-group.ds.js';
import { IInviteUserInCompanyAndConnectionGroup } from './company-info-use-cases.interface.js';
import { InvitedUserInCompanyAndConnectionGroupDs } from '../application/data-structures/invited-user-in-company-and-connection-group.ds.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Logger } from '../../../helpers/logging/Logger.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { isTest } from '../../../helpers/app/is-test.js';
import { EmailService } from '../../email/email/email.service.js';

@Injectable({ scope: Scope.REQUEST })
export class InviteUserInCompanyAndConnectionGroupUseCase
  extends AbstractUseCase<InviteUserInCompanyAndConnectionGroupDs, InvitedUserInCompanyAndConnectionGroupDs>
  implements IInviteUserInCompanyAndConnectionGroup
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  protected async implementation(
    inputData: InviteUserInCompanyAndConnectionGroupDs,
  ): Promise<InvitedUserInCompanyAndConnectionGroupDs> {
    const { inviterId, companyId, groupId, invitedUserCompanyRole } = inputData;
    const invitedUserEmail = inputData.invitedUserEmail.toLowerCase();
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
            message: Messages.MAXIMUM_INVITATIONS_COUNT_REACHED_CANT_INVITE,
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
      const companyCustomDomain = await this.saasCompanyGatewayService.getCompanyCustomDomainById(companyId);
      const renewedInvitation = await this._dbContext.invitationInCompanyRepository.createOrUpdateInvitationInCompany(
        foundCompany,
        groupId,
        inviterId,
        invitedUserEmail,
        invitedUserCompanyRole,
      );
      const sendEmailResult = await this.emailService.sendInvitationToCompany(
        invitedUserEmail,
        renewedInvitation.verification_string,
        foundCompany.id,
        foundCompany.name,
        companyCustomDomain,
      );

      if (!sendEmailResult && !isTest() && !isSaaS()) {
        throw new HttpException(
          {
            message: Messages.EMAIL_SEND_FAILED(invitedUserEmail),
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

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
    const companyCustomDomain = await this.saasCompanyGatewayService.getCompanyCustomDomainById(companyId);
    await this.emailService.sendInvitationToCompany(
      invitedUserEmail,
      newInvitation.verification_string,
      companyId,
      foundCompany.name,
      companyCustomDomain,
    );
    if (isSaaS()) {
      await this.saasCompanyGatewayService.invitationSentWebhook(
        companyId,
        invitedUserEmail,
        invitedUserCompanyRole,
        inviterId,
        newInvitation.verification_string,
      );
    }
    const invitationRO: any = {
      companyId: companyId,
      groupId: groupId,
      email: invitedUserEmail,
      role: invitedUserCompanyRole,
    };
    if (process.env.NODE_ENV === 'test') {
      invitationRO.verificationString = newInvitation.verification_string;
    }
    return invitationRO;
  }
}
