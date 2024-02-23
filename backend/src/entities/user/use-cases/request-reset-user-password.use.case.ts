import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IRequestPasswordReset } from './user-use-cases.interfaces.js';
import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { sendPasswordResetRequest } from '../../email/send-email.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { OperationResultMessageDs } from '../application/data-structures/operation-result-message.ds.js';

export class RequestResetUserPasswordUseCase
  extends AbstractUseCase<string, OperationResultMessageDs>
  implements IRequestPasswordReset
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(email: string): Promise<OperationResultMessageDs> {
    const foundUser = await this._dbContext.userRepository.findOneUserByEmail(email);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_MISSING_EMAIL_OR_SOCIAL_REGISTERED,
        },
        HttpStatus.FORBIDDEN,
      );
    }
    const savedResetPasswordRequest = await this._dbContext.passwordResetRepository.createOrUpdatePasswordResetEntity(
      foundUser,
    );
    const mailingResult = await sendPasswordResetRequest(
      foundUser.email,
      savedResetPasswordRequest.verification_string,
    );
    const resultMessage = mailingResult.messageId
      ? Messages.PASSWORD_RESET_REQUESTED_SUCCESSFULLY
      : Messages.PASSWORD_RESET_REQUESTED;
    return { message: resultMessage };
  }
}
