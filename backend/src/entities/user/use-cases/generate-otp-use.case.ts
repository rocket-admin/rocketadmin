import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGenerateOTP } from './user-use-cases.interfaces.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { authenticator } from 'otplib';
import { OtpSecretDS } from '../application/data-structures/otp-secret.ds.js';
import { generateQRCode } from '../utils/generate-qr-code.js';

@Injectable()
export class GenerateOtpUseCase extends AbstractUseCase<string, OtpSecretDS> implements IGenerateOTP {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(userId: string): Promise<OtpSecretDS> {
    const foundUser = await this._dbContext.userRepository.findOneUserById(userId);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const otpSecretKey = authenticator.generateSecret();
    foundUser.otpSecretKey = otpSecretKey;
    await this._dbContext.userRepository.saveUserEntity(foundUser);
    const { otpauth, qrCode } = await generateQRCode(foundUser.email, otpSecretKey);
    return {
      otpauth_url: otpauth,
      qrCode: qrCode,
    };
  }
}
