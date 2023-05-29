import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IVerifyOTP } from './user-use-cases.interfaces.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { authenticator } from 'otplib';
import { OtpValidationResultDS } from '../application/data-structures/otp-validation-result.ds.js';
import { VerifyOtpDS } from '../application/data-structures/verify-otp.ds.js';

@Injectable()
export class VerifyOtpUseCase extends AbstractUseCase<VerifyOtpDS, OtpValidationResultDS> implements IVerifyOTP {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: VerifyOtpDS): Promise<OtpValidationResultDS> {
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
      foundUser.isOTPEnabled = true;
      await this._dbContext.userRepository.saveUserEntity(foundUser);
      return {
        validated: true,
      };
    }
    throw new HttpException(
      {
        message: Messages.OTP_VALIDATION_FAILED,
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}
