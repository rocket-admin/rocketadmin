import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IVerifyEmail } from './user-use-cases.interfaces.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { OperationResultMessageDs } from '../application/data-structures/operation-result-message.ds.js';

@Injectable()
export class VerifyUserEmailUseCase extends AbstractUseCase<string, OperationResultMessageDs> implements IVerifyEmail {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(verificationString: string): Promise<OperationResultMessageDs> {
    const foundVerificationEntity =
      await this._dbContext.emailVerificationRepository.findVerificationWithVerificationString(verificationString);
    if (!foundVerificationEntity || !foundVerificationEntity.user) {
      throw new HttpException(
        {
          message: Messages.EMAIL_VERIFICATION_FAILED,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const foundUser = await this._dbContext.userRepository.findOneUserById(foundVerificationEntity.user.id);
    foundUser.isActive = true;
    await this._dbContext.userRepository.saveUserEntity(foundUser);
    await this._dbContext.emailVerificationRepository.removeVerificationEntity(foundVerificationEntity);
    return { message: Messages.EMAIL_VERIFIED_SUCCESSFULLY };
  }
}
