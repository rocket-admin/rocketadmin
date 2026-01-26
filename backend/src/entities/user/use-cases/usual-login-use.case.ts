import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { UsualLoginDs } from '../application/data-structures/usual-login.ds.js';
import { generateGwtToken, generateTemporaryJwtToken, IToken } from '../utils/generate-gwt-token.js';
import { IUsualLogin } from './user-use-cases.interfaces.js';
import { UserEntity } from '../user.entity.js';
import { get2FaScope } from '../utils/is-jwt-scope-need.util.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { isTest } from '../../../helpers/app/is-test.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { ValidationHelper } from '../../../helpers/validators/validation-helper.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { SignInAuditService } from '../../user-sign-in-audit/sign-in-audit.service.js';
import { SignInStatusEnum } from '../../user-sign-in-audit/enums/sign-in-status.enum.js';
import { SignInMethodEnum } from '../../user-sign-in-audit/enums/sign-in-method.enum.js';

@Injectable()
export class UsualLoginUseCase extends AbstractUseCase<UsualLoginDs, IToken> implements IUsualLogin {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
    private readonly signInAuditService: SignInAuditService,
  ) {
    super();
  }

  protected async implementation(userData: UsualLoginDs): Promise<IToken> {
    const { request_domain, ipAddress, userAgent } = userData;
    let { companyId } = userData;
    const email = userData.email.toLowerCase();
    let user: UserEntity = null;

    if (companyId) {
      user = await this._dbContext.userRepository.findOneUserByEmailAndCompanyId(email, companyId);
      if (!user) {
        await this.recordSignInAudit(
          email,
          null,
          SignInStatusEnum.FAILED,
          ipAddress,
          userAgent,
          Messages.USER_NOT_FOUND,
        );
        throw new NotFoundException(Messages.USER_NOT_FOUND);
      }
    } else if (!Constants.APP_REQUEST_DOMAINS().includes(request_domain) && isSaaS()) {
      const foundUserCompanyIdByDomain =
        await this.saasCompanyGatewayService.getCompanyIdByCustomDomain(request_domain);
      const foundUser = await this._dbContext.userRepository.findOneUserByEmailAndCompanyId(
        email,
        foundUserCompanyIdByDomain,
      );
      if (!foundUser) {
        await this.recordSignInAudit(
          email,
          null,
          SignInStatusEnum.FAILED,
          ipAddress,
          userAgent,
          Messages.USER_NOT_FOUND_FOR_THIS_DOMAIN,
        );
        throw new BadRequestException(Messages.USER_NOT_FOUND_FOR_THIS_DOMAIN);
      }
      user = foundUser;
      companyId = foundUser.company.id;
    } else {
      const foundUsers = await this._dbContext.userRepository.findAllUsersWithEmail(email);
      if (foundUsers.length > 1) {
        await this.recordSignInAudit(
          email,
          null,
          SignInStatusEnum.FAILED,
          ipAddress,
          userAgent,
          Messages.LOGIN_DENIED_SHOULD_CHOOSE_COMPANY,
        );
        throw new BadRequestException(Messages.LOGIN_DENIED_SHOULD_CHOOSE_COMPANY);
      }
      user = foundUsers[0];
      companyId = foundUsers[0]?.company?.id;
    }

    if (!user) {
      await this.recordSignInAudit(email, null, SignInStatusEnum.FAILED, ipAddress, userAgent, Messages.USER_NOT_FOUND);
      throw new NotFoundException(Messages.USER_NOT_FOUND);
    }
    if (!userData.password) {
      await this.recordSignInAudit(
        email,
        user.id,
        SignInStatusEnum.FAILED,
        ipAddress,
        userAgent,
        Messages.PASSWORD_MISSING,
      );
      throw new BadRequestException(Messages.PASSWORD_MISSING);
    }

    await this.validateRequestDomain(request_domain, companyId);

    const passwordValidationResult = await Encryptor.verifyUserPassword(userData.password, user.password);
    if (!passwordValidationResult) {
      await this.recordSignInAudit(
        email,
        user.id,
        SignInStatusEnum.FAILED,
        ipAddress,
        userAgent,
        Messages.LOGIN_DENIED,
      );
      throw new BadRequestException(Messages.LOGIN_DENIED);
    }
    if (user.isOTPEnabled) {
      return generateTemporaryJwtToken(user);
    }

    await this.recordSignInAudit(email, user.id, SignInStatusEnum.SUCCESS, ipAddress, userAgent);

    const foundUserCompany = await this._dbContext.companyInfoRepository.finOneCompanyInfoByUserId(user.id);
    return generateGwtToken(user, get2FaScope(user, foundUserCompany));
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
        signInMethod: SignInMethodEnum.EMAIL,
        ipAddress,
        userAgent,
        failureReason,
      });
    } catch (e) {
      console.error('Failed to record sign-in audit:', e);
    }
  }

  private async validateRequestDomain(requestDomain: string, companyId: string): Promise<void> {
    if (!isSaaS()) {
      return;
    }

    const allowedDomains: Array<string> = [`saas.rocketadmin.com`, `app.rocketadmin.com`, Constants.APP_DOMAIN_ADDRESS];

    if (isTest()) {
      allowedDomains.push(`127.0.0.1`);
      if (allowedDomains.includes(requestDomain)) {
        return;
      }
    }

    if (allowedDomains.includes(requestDomain)) {
      return;
    }

    if (!ValidationHelper.isValidDomain(requestDomain) && !isTest()) {
      throw new BadRequestException(Messages.INVALID_REQUEST_DOMAIN_FORMAT);
    }

    const companyIdByDomain: string | null =
      await this.saasCompanyGatewayService.getCompanyIdByCustomDomain(requestDomain);

    if (companyIdByDomain && companyIdByDomain === companyId) {
      return;
    }
    throw new BadRequestException(Messages.INVALID_REQUEST_DOMAIN);
  }
}
