import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { authenticator } from 'otplib';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { OtpDisablingResultDS } from '../application/data-structures/otp-validation-result.ds.js';
import { VerifyOtpDS } from '../application/data-structures/verify-otp.ds.js';
import { IDisableOTP } from './user-use-cases.interfaces.js';

@Injectable()
export class DisableOtpUseCase extends AbstractUseCase<VerifyOtpDS, OtpDisablingResultDS> implements IDisableOTP {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: VerifyOtpDS): Promise<OtpDisablingResultDS> {
    const { userId, otpToken } = inputData;
    const foundUser = await this._dbContext.userRepository.findOneUserById(userId);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const { otpSecretKey } = foundUser;
    if (!otpSecretKey) {
      throw new HttpException(
        {
          message: Messages.OTP_NOT_ENABLED,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const isValid = authenticator.check(otpToken, otpSecretKey);
    if (isValid) {
      foundUser.isOTPEnabled = false;
      foundUser.otpSecretKey = null;
      await this._dbContext.userRepository.saveUserEntity(foundUser);
      return {
        disabled: true,
      };
    }
    throw new HttpException(
      {
        message: Messages.OTP_DISABLING_FAILED,
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}
