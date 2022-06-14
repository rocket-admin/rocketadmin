import AbstractUseCase from '../../../common/abstract-use.case';
import { IRequestPasswordReset } from './user-use-cases.interfaces';
import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { sendPasswordResetRequest } from '../../email/send-email';
import { Messages } from '../../../exceptions/text/messages';
import { OperationResultMessageDs } from '../application/data-structures/operation-result-message.ds';

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
    if (!foundUser.isActive) {
      throw new HttpException(
        {
          message: Messages.EMAIL_NOT_CONFIRMED,
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
