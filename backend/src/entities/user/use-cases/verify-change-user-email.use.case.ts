import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { EmailService } from '../../email/email/email.service.js';
import { ChangeUserEmailDs } from '../application/data-structures/change-user-email.ds.js';
import { OperationResultMessageDs } from '../application/data-structures/operation-result-message.ds.js';
import { IVerifyEmailChange } from './user-use-cases.interfaces.js';

@Injectable()
export class VerifyChangeUserEmailUseCase
  extends AbstractUseCase<ChangeUserEmailDs, OperationResultMessageDs>
  implements IVerifyEmailChange
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  protected async implementation(inputData: ChangeUserEmailDs): Promise<OperationResultMessageDs> {
    const { verificationString } = inputData;
    const newEmail = inputData.newEmail.toLowerCase();
    const verificationEntity =
      await this._dbContext.emailChangeRepository.findEmailChangeWithVerificationString(verificationString);
    if (!verificationEntity || !verificationEntity.user) {
      throw new HttpException(
        {
          message: Messages.PASSWORD_RESET_VERIFICATION_FAILED,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const foundExistingUsersWithThisEmail = await this._dbContext.userRepository.find({
      where: { email: newEmail },
    });

    if (foundExistingUsersWithThisEmail.length > 0) {
      throw new HttpException(
        {
          message: Messages.CANNOT_SET_THIS_EMAIL,
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
    await this.emailService.sendEmailChanged(newEmail);
    return { message: Messages.EMAIL_CHANGED };
  }
}
