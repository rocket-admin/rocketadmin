import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { OperationResultMessageDs } from '../application/data-structures/operation-result-message.ds.js';
import { RequestRestUserPasswordDto } from '../dto/request-rest-user-password.dto.js';
import { IRequestPasswordReset } from './user-use-cases.interfaces.js';
import { EmailService } from '../../email/email/email.service.js';

export class RequestResetUserPasswordUseCase
  extends AbstractUseCase<RequestRestUserPasswordDto, OperationResultMessageDs>
  implements IRequestPasswordReset
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  protected async implementation(emailData: RequestRestUserPasswordDto): Promise<OperationResultMessageDs> {
    const { companyId } = emailData;
    const email = emailData.email.toLowerCase();
    const foundUser = await this._dbContext.userRepository.findOneUserByEmailAndCompanyId(email, companyId);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_MISSING_EMAIL_OR_SOCIAL_REGISTERED,
        },
        HttpStatus.FORBIDDEN,
      );
    }
    const companyCustomDomain = await this.saasCompanyGatewayService.getCompanyCustomDomainById(companyId);

    const savedResetPasswordRequest =
      await this._dbContext.passwordResetRepository.createOrUpdatePasswordResetEntity(foundUser);

    const mailingResult = await this.emailService.sendPasswordResetRequest(
      foundUser.email,
      savedResetPasswordRequest.verification_string,
      companyCustomDomain,
    );
    const resultMessage = mailingResult.messageId
      ? Messages.PASSWORD_RESET_REQUESTED_SUCCESSFULLY
      : Messages.PASSWORD_RESET_REQUESTED;
    return { message: resultMessage };
  }
}
