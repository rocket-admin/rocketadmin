import AbstractUseCase from '../../../common/abstract-use.case';
import { ChangeUserEmailDs } from '../application/data-structures/change-user-email.ds';
import { IVerifyEmailChange } from './user-use-cases.interfaces';
import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { Messages } from '../../../exceptions/text/messages';
import { sendEmailChanged } from '../../email/send-email';
import { OperationResultMessageDs } from '../application/data-structures/operation-result-message.ds';

@Injectable({ scope: Scope.REQUEST })
export class VerifyChangeUserEmailUseCase
  extends AbstractUseCase<ChangeUserEmailDs, OperationResultMessageDs>
  implements IVerifyEmailChange
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: ChangeUserEmailDs): Promise<OperationResultMessageDs> {
    const { newEmail, verificationString } = inputData;
    const verificationEntity = await this._dbContext.emailChangeRepository.findEmailChangeWithVerificationString(
      verificationString,
    );
    if (!verificationEntity || !verificationEntity.user) {
      throw new HttpException(
        {
          message: Messages.PASSWORD_RESET_VERIFICATION_FAILED,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const foundUser = await this._dbContext.userRepository.findOneUserById(verificationEntity.user.id);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    foundUser.email = newEmail;
    await this._dbContext.userRepository.saveUserEntity(foundUser);
    await this._dbContext.emailChangeRepository.removeEmailChangeEntity(verificationEntity);
    await sendEmailChanged(newEmail);
    return { message: Messages.EMAIL_CHANGED };
  }
}
