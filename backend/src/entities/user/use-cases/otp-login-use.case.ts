import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IOtpLogin } from './user-use-cases.interfaces.js';
import { IToken, generateGwtToken } from '../utils/generate-gwt-token.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { VerifyOtpDS } from '../application/data-structures/verify-otp.ds.js';
import { authenticator } from 'otplib';
import { get2FaScope } from '../utils/is-jwt-scope-need.util.js';
import { SignInAuditService } from '../../user-sign-in-audit/sign-in-audit.service.js';
import { SignInStatusEnum } from '../../user-sign-in-audit/enums/sign-in-status.enum.js';
import { SignInMethodEnum } from '../../user-sign-in-audit/enums/sign-in-method.enum.js';

@Injectable()
export class OtpLoginUseCase extends AbstractUseCase<VerifyOtpDS, IToken> implements IOtpLogin {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly signInAuditService: SignInAuditService,
  ) {
    super();
  }

  protected async implementation(inputData: VerifyOtpDS): Promise<IToken> {
    const { userId, otpToken, ipAddress, userAgent } = inputData;
    const foundUser = await this._dbContext.userRepository.findOneUserById(userId);
    if (!foundUser) {
      throw new NotFoundException(Messages.USER_NOT_FOUND);
    }
    const isValid = authenticator.check(otpToken, foundUser.otpSecretKey);
    if (!isValid) {
      await this.recordSignInAudit(
        foundUser.email,
        userId,
        SignInStatusEnum.FAILED,
        ipAddress,
        userAgent,
        Messages.LOGIN_DENIED_INVALID_OTP,
      );
      throw new BadRequestException(Messages.LOGIN_DENIED_INVALID_OTP);
    }

    await this.recordSignInAudit(foundUser.email, userId, SignInStatusEnum.SUCCESS, ipAddress, userAgent);

    const foundUserCompany = await this._dbContext.companyInfoRepository.finOneCompanyInfoByUserId(foundUser.id);
    return generateGwtToken(foundUser, get2FaScope(foundUser, foundUserCompany));
  }

  private async recordSignInAudit(
    email: string,
    userId: string | null,
    status: SignInStatusEnum,
    ipAddress: string,
    userAgent: string,
    failureReason?: string,
  ): Promise<void> {
    try {
      await this.signInAuditService.createSignInAuditRecord({
        email,
        userId,
        status,
        signInMethod: SignInMethodEnum.OTP,
        ipAddress,
        userAgent,
        failureReason,
      });
    } catch (e) {
      console.error('Failed to record sign-in audit:', e);
    }
  }
}
