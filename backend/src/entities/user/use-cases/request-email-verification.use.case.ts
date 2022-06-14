import AbstractUseCase from '../../../common/abstract-use.case';
import { BaseType } from '../../../common/data-injection.tokens';
import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { IRequestEmailVerification } from './user-use-cases.interfaces';
import { Messages } from '../../../exceptions/text/messages';
import { sendEmailConfirmation } from '../../email/send-email';
import { OperationResultMessageDs } from '../application/data-structures/operation-result-message.ds';

@Injectable({ scope: Scope.REQUEST })
export class RequestEmailVerificationUseCase
  extends AbstractUseCase<string, OperationResultMessageDs>
  implements IRequestEmailVerification
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
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
    const newEmailVerification = await this._dbContext.emailVerificationRepository.createOrUpdateEmailVerification(
      foundUser,
    );
    await sendEmailConfirmation(foundUser.email, newEmailVerification.verification_string);
    return { message: Messages.EMAIL_VERIFICATION_REQUESTED };
  }
}
