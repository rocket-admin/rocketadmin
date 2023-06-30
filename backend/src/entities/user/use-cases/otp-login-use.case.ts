import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IOtpLogin } from './user-use-cases.interfaces.js';
import { IToken, generateGwtToken } from '../utils/generate-gwt-token.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { VerifyOtpDS } from '../application/data-structures/verify-otp.ds.js';
import { authenticator } from 'otplib';

@Injectable()
export class OtpLoginUseCase extends AbstractUseCase<VerifyOtpDS, IToken> implements IOtpLogin {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: VerifyOtpDS): Promise<IToken> {
    const { userId, otpToken } = inputData;
    const foundUser = await this._dbContext.userRepository.findOneUserById(userId);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.LOGIN_DENIED,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    const isValid = authenticator.check(otpToken, foundUser.otpSecretKey);
    if (!isValid) {
      throw new HttpException(
        {
          message: Messages.LOGIN_DENIED,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return generateGwtToken(foundUser);
  }
}
