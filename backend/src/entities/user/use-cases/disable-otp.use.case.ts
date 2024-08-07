import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
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
      throw new NotFoundException(Messages.USER_NOT_FOUND);
    }

    const foundUserCompany = await this._dbContext.companyInfoRepository.finOneCompanyInfoByUserId(userId);
    if (foundUserCompany.is2faEnabled) {
      throw new ForbiddenException(Messages.DISABLING_2FA_FORBIDDEN_BY_ADMIN);
    }

    const { otpSecretKey } = foundUser;
    if (!otpSecretKey) {
      throw new BadRequestException(Messages.OTP_NOT_ENABLED);
    }
    try {
      const isValid = authenticator.check(otpToken, otpSecretKey);
      if (isValid) {
        foundUser.isOTPEnabled = false;
        foundUser.otpSecretKey = null;
        await this._dbContext.userRepository.saveUserEntity(foundUser);
        return {
          disabled: true,
        };
      }
    } catch (_error) {
      throw new BadRequestException(Messages.OTP_DISABLING_FAILED_INVALID_TOKEN);
    }
    throw new InternalServerErrorException(Messages.OTP_DISABLING_FAILED);
  }
}
