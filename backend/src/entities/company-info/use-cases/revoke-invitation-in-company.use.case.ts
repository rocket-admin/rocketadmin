import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { RevokeUserInvitationDs } from '../application/data-structures/revoke-user-invitation.dto.js';
import { IRevokeUserInvitationInCompany } from './company-info-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class RevokeUserInvitationInCompanyUseCase
  extends AbstractUseCase<RevokeUserInvitationDs, SuccessResponse>
  implements IRevokeUserInvitationInCompany
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: RevokeUserInvitationDs): Promise<SuccessResponse> {
    const { companyId } = inputData;
    const email = inputData.email.toLowerCase();
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
