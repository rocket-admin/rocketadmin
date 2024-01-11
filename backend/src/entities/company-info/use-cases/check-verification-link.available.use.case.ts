import { Inject } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { ICheckVerificationLinkAvailable } from './company-info-use-cases.interface.js';

export class CheckIsVerificationLinkAvailable
  extends AbstractUseCase<string, SuccessResponse>
  implements ICheckVerificationLinkAvailable
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(verificationString: string): Promise<SuccessResponse> {
    const foundInvitation =
      await this._dbContext.invitationInCompanyRepository.findNonExpiredInvitationInCompanyWithUsersByVerificationString(
        verificationString,
      );
    if (!foundInvitation) {
      return {
        success: false,
      };
    }
    return {
      success: true,
    };
  }
}
