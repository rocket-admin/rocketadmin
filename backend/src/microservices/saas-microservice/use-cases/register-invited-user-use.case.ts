import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { FoundUserDto } from '../../../entities/user/dto/found-user.dto.js';
import { RegisterInvitedUserDS } from '../../../entities/user/application/data-structures/usual-register-user.ds.js';
import { RegisterUserDs } from '../../../entities/user/application/data-structures/register-user-ds.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { ValidationHelper } from '../../../helpers/validators/validation-helper.js';
import { ISaaSRegisterInvitedUser } from './saas-use-cases.interface.js';
import { SaasCompanyGatewayService } from '../../gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { EmailService } from '../../../entities/email/email/email.service.js';

@Injectable()
export class SaasRegisterInvitedUserUseCase
  extends AbstractUseCase<RegisterInvitedUserDS, FoundUserDto>
  implements ISaaSRegisterInvitedUser
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  protected async implementation(userData: RegisterInvitedUserDS): Promise<FoundUserDto> {
    const { email, password, name, companyId } = userData;
    ValidationHelper.isPasswordStrongOrThrowError(password);
    const foundUser = await this._dbContext.userRepository.findOneUserByEmailAndCompanyId(email, companyId);
    const foundCompany = await this._dbContext.companyInfoRepository.findCompanyInfoWithUsersById(companyId);

    if (foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_ALREADY_REGISTERED(email),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!foundCompany) {
      throw new HttpException(
        {
          message: Messages.COMPANY_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const registerUserData: RegisterUserDs = {
      email: email,
      password: password,
      isActive: false,
      gclidValue: null,
      name: name,
    };
    const savedUser = await this._dbContext.userRepository.saveRegisteringUser(registerUserData);

    savedUser.company = foundCompany;
    await this._dbContext.userRepository.saveUserEntity(savedUser);

    const createdEmailVerification =
      await this._dbContext.emailVerificationRepository.createOrUpdateEmailVerification(savedUser);

    const companyCustomDomain = await this.saasCompanyGatewayService.getCompanyCustomDomainById(companyId);

    await this.emailService.sendEmailConfirmation(
      savedUser.email,
      createdEmailVerification.verification_string,
      companyCustomDomain,
    );
    return {
      id: savedUser.id,
      createdAt: savedUser.createdAt,
      isActive: savedUser.isActive,
      email: savedUser.email,
      intercom_hash: null,
      name: savedUser.name,
      role: savedUser.role,
      is_2fa_enabled: false,
      suspended: false,
      externalRegistrationProvider: savedUser.externalRegistrationProvider,
      show_test_connections: savedUser.showTestConnections,
    };
  }
}
