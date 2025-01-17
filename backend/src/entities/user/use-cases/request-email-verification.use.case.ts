import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { sendEmailConfirmation } from '../../email/send-email.js';
import { OperationResultMessageDs } from '../application/data-structures/operation-result-message.ds.js';
import { IRequestEmailVerification } from './user-use-cases.interfaces.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';

@Injectable()
export class RequestEmailVerificationUseCase
  extends AbstractUseCase<string, OperationResultMessageDs>
  implements IRequestEmailVerification
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(userId: string): Promise<OperationResultMessageDs> {
    const foundUser = await this._dbContext.userRepository.findOneUserWithEmailVerification(userId);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (foundUser.isActive) {
      throw new HttpException(
        {
          message: Messages.EMAIL_ALREADY_CONFIRMED,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const foundUserCompany = await this._dbContext.companyInfoRepository.finOneCompanyInfoByUserId(foundUser.id);
    const companyCustomDomain = await this.saasCompanyGatewayService.getCompanyCustomDomainById(foundUserCompany.id);

    const newEmailVerification =
      await this._dbContext.emailVerificationRepository.createOrUpdateEmailVerification(foundUser);
    await sendEmailConfirmation(foundUser.email, newEmailVerification.verification_string, companyCustomDomain);
    return { message: Messages.EMAIL_VERIFICATION_REQUESTED };
  }
}
