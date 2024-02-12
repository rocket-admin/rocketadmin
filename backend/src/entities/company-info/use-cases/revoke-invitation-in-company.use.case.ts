import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { IRevokeUserInvitationInCompany } from './company-info-use-cases.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { RevokeUserInvitationDs } from '../application/data-structures/revoke-user-invitation.dto.js';

@Injectable({ scope: Scope.REQUEST })
export class RevokeUserInvitationInCompanyUseCase
  extends AbstractUseCase<RevokeUserInvitationDs, SuccessResponse>
  implements IRevokeUserInvitationInCompany
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(inputData: RevokeUserInvitationDs): Promise<SuccessResponse> {
    const { companyId, email } = inputData;
    const foundCompanyWithInvitations =
      await this._dbContext.companyInfoRepository.findCompanyWithInvitationsById(companyId);
    if (!foundCompanyWithInvitations) {
      throw new HttpException(
        {
          message: Messages.COMPANY_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    const foundInvitation = foundCompanyWithInvitations.invitations.find(
      (invitation) => invitation.invitedUserEmail === email,
    );
    if (!foundInvitation) {
      throw new HttpException(
        {
          message: Messages.NOTHING_TO_REVOKE,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (isSaaS()) {
      const saasRevokeResponse = await this.saasCompanyGatewayService.revokeUserInvitationInCompany(
        companyId,
        foundInvitation.verification_string,
      );
      if (!saasRevokeResponse.success) {
        throw new HttpException(
          {
            message: Messages.FILED_REVOKE_USER_INVITATION_UNHANDLED_ERROR,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
    foundCompanyWithInvitations.invitations = foundCompanyWithInvitations.invitations.filter(
      (invitation) => invitation.invitedUserEmail !== email,
    );
    await this._dbContext.companyInfoRepository.save(foundCompanyWithInvitations);
    await this._dbContext.invitationInCompanyRepository.remove(foundInvitation);
    return {
      success: true,
    };
  }
}
