import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { sendEmailChangeRequest } from '../../email/send-email.js';
import { OperationResultMessageDs } from '../application/data-structures/operation-result-message.ds.js';
import { IRequestEmailChange } from './user-use-cases.interfaces.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';

@Injectable()
export class RequestChangeUserEmailUseCase
  extends AbstractUseCase<string, OperationResultMessageDs>
  implements IRequestEmailChange
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(userId: string): Promise<OperationResultMessageDs> {
    const foundUser = await this._dbContext.userRepository.findOneUserById(userId);
    if (!foundUser.isActive) {
      throw new HttpException(
        {
          message: Messages.EMAIL_NOT_CONFIRMED,
        },
        HttpStatus.FORBIDDEN,
      );
    }
    const savedEmailChangeRequest =
      await this._dbContext.emailChangeRepository.createOrUpdateEmailChangeEntity(foundUser);
    const userCompanyInfo = await this._dbContext.companyInfoRepository.findCompanyInfoByUserId(userId);
    const companyCustomDomain = await this.saasCompanyGatewayService.getCompanyCustomDomainById(userCompanyInfo.id);
    const mailingResult = await sendEmailChangeRequest(
      foundUser.email,
      savedEmailChangeRequest.verification_string,
      companyCustomDomain,
    );
    const resultMessage = mailingResult.messageId
      ? Messages.EMAIL_CHANGE_REQUESTED_SUCCESSFULLY
      : Messages.EMAIL_CHANGE_REQUESTED;
    return { message: resultMessage };
  }
}
