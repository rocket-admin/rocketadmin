import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { Messages } from '../../../exceptions/text/messages';
import { Encryptor } from '../../../helpers/encryption/encryptor';
import { ValidationHelper } from '../../../helpers/validators/validation-helper';
import { RegisteredUserDs } from '../application/data-structures/registered-user.ds';
import { ResetUsualUserPasswordDs } from '../application/data-structures/reset-usual-user-password.ds';
import { generateGwtToken } from '../utils/generate-gwt-token';
import { IVerifyPasswordReset } from './user-use-cases.interfaces';

@Injectable()
export class VerifyResetUserPasswordUseCase
  extends AbstractUseCase<ResetUsualUserPasswordDs, RegisteredUserDs>
  implements IVerifyPasswordReset
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: ResetUsualUserPasswordDs): Promise<RegisteredUserDs> {
    const { verificationString, newUserPassword } = inputData;
    ValidationHelper.isPasswordStrongOrThrowError(newUserPassword);
    const verificationEntity = await this._dbContext.passwordResetRepository.findPasswordResetWidthVerificationString(
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
    foundUser.password = await Encryptor.hashUserPassword(newUserPassword);
    await this._dbContext.userRepository.saveUserEntity(foundUser);
    await this._dbContext.passwordResetRepository.removePasswordResetEntity(verificationEntity);
    return {
      id: foundUser.id,
      email: foundUser.email,
      token: generateGwtToken(foundUser),
      name: foundUser.name,
    };
  }
}
