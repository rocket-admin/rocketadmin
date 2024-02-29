import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { ValidationHelper } from '../../../helpers/validators/validation-helper.js';
import { RegisteredUserDs } from '../application/data-structures/registered-user.ds.js';
import { ResetUsualUserPasswordDs } from '../application/data-structures/reset-usual-user-password.ds.js';
import { generateGwtToken } from '../utils/generate-gwt-token.js';
import { IVerifyPasswordReset } from './user-use-cases.interfaces.js';
import { get2FaScope } from '../utils/is-jwt-scope-need.util.js';

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
    const verificationEntity =
      await this._dbContext.passwordResetRepository.findPasswordResetWidthVerificationString(verificationString);
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
    const foundUserCompany = await this._dbContext.companyInfoRepository.finOneCompanyInfoByUserId(foundUser.id);
    return {
      id: foundUser.id,
      email: foundUser.email,
      token: generateGwtToken(foundUser, get2FaScope(foundUser, foundUserCompany)),
      name: foundUser.name,
    };
  }
}
