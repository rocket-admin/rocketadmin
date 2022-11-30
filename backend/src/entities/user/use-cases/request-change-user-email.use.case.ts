import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { Messages } from '../../../exceptions/text/messages';
import { sendEmailChangeRequest } from '../../email/send-email';
import { OperationResultMessageDs } from '../application/data-structures/operation-result-message.ds';
import { IRequestEmailChange } from './user-use-cases.interfaces';

@Injectable()
export class RequestChangeUserEmailUseCase
  extends AbstractUseCase<string, OperationResultMessageDs>
  implements IRequestEmailChange
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
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
    const savedEmailChangeRequest = await this._dbContext.emailChangeRepository.createOrUpdateEmailChangeEntity(
      foundUser,
    );
    const mailingResult = await sendEmailChangeRequest(foundUser.email, savedEmailChangeRequest.verification_string);
    const resultMessage = mailingResult.messageId
      ? Messages.EMAIL_CHANGE_REQUESTED_SUCCESSFULLY
      : Messages.EMAIL_CHANGE_REQUESTED;
    return { message: resultMessage };
  }
}
