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

@Injectable()
export class UsualLoginUseCase extends AbstractUseCase<UsualLoginDs, IToken> implements IUsualLogin {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(userData: UsualLoginDs): Promise<IToken> {
    const { request_domain } = userData;
    let { companyId } = userData;
    const email = userData.email.toLowerCase();
    let user: UserEntity = null;

    if (companyId) {
      user = await this._dbContext.userRepository.findOneUserByEmailAndCompanyId(email, companyId);
      if (!user) {
        throw new NotFoundException(Messages.USER_NOT_FOUND);
      }
    } else if (!Constants.APP_REQUEST_DOMAINS().includes(request_domain) && !isSaaS()) {
      const foundUserCompanyIdByDomain =
        await this.saasCompanyGatewayService.getCompanyIdByCustomDomain(request_domain);
      const foundUser = await this._dbContext.userRepository.findOneUserByEmailAndCompanyId(
        email,
        foundUserCompanyIdByDomain,
      );
      if (!foundUser) {
        throw new BadRequestException(Messages.USER_NOT_FOUND_FOR_THIS_DOMAIN);
      }
      user = foundUser;
      companyId = foundUser.company.id;
    } else {
      const foundUsers = await this._dbContext.userRepository.findAllUsersWithEmail(email);
      if (foundUsers.length > 1) {
        throw new BadRequestException(Messages.LOGIN_DENIED_SHOULD_CHOOSE_COMPANY);
      }
      user = foundUsers[0];
      companyId = foundUsers[0].company.id;
    }

    if (!user) {
      throw new NotFoundException(Messages.USER_NOT_FOUND);
    }
    if (!userData.password) {
      throw new BadRequestException(Messages.PASSWORD_MISSING);
    }

    await this.validateRequestDomain(request_domain, companyId);

    const passwordValidationResult = await Encryptor.verifyUserPassword(userData.password, user.password);
    if (!passwordValidationResult) {
      throw new BadRequestException(Messages.LOGIN_DENIED);
    }
    if (user.isOTPEnabled) {
      return generateTemporaryJwtToken(user);
    }
    const foundUserCompany = await this._dbContext.companyInfoRepository.finOneCompanyInfoByUserId(user.id);
    return generateGwtToken(user, get2FaScope(user, foundUserCompany));
  }

  private async validateRequestDomain(requestDomain: string, companyId: string): Promise<void> {
    if (!isSaaS()) {
      return;
    }

    if (!ValidationHelper.isValidDomain(requestDomain) && !isTest()) {
      throw new BadRequestException(Messages.INVALID_REQUEST_DOMAIN_FORMAT);
    }

    const allowedDomains: Array<string> = [`saas.rocketadmin.com`, `app.rocketadmin.com`];

    if (allowedDomains.includes(requestDomain)) {
      return;
    }

    if (isTest()) {
      allowedDomains.push(`127.0.0.1`);
      if (allowedDomains.includes(requestDomain)) {
        return;
      }
    }
    const companyIdByDomain: string | null =
      await this.saasCompanyGatewayService.getCompanyIdByCustomDomain(requestDomain);

    if (companyIdByDomain && companyIdByDomain === companyId) {
      return;
    }
    throw new BadRequestException(Messages.INVALID_REQUEST_DOMAIN);
  }
}
