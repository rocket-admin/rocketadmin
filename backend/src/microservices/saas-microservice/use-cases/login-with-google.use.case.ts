import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { DemoDataService } from '../../../entities/demo-data/demo-data.service.js';
import { RegisterUserDs } from '../../../entities/user/application/data-structures/register-user-ds.js';
import { ExternalRegistrationProviderEnum } from '../../../entities/user/enums/external-registration-provider.enum.js';
import { UserEntity } from '../../../entities/user/user.entity.js';
import { SaasRegisterUserWithGoogleDS } from '../data-structures/sass-register-user-with-google.js';
import { ILoginUserWithGoogle } from './saas-use-cases.interface.js';
import { SignInAuditService } from '../../../entities/user-sign-in-audit/sign-in-audit.service.js';
import { SignInStatusEnum } from '../../../entities/user-sign-in-audit/enums/sign-in-status.enum.js';
import { SignInMethodEnum } from '../../../entities/user-sign-in-audit/enums/sign-in-method.enum.js';

@Injectable()
export class LoginWithGoogleUseCase
  extends AbstractUseCase<SaasRegisterUserWithGoogleDS, UserEntity>
  implements ILoginUserWithGoogle
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly demoDataService: DemoDataService,
    private readonly signInAuditService: SignInAuditService,
  ) {
    super();
  }

  protected async implementation(inputData: SaasRegisterUserWithGoogleDS): Promise<UserEntity> {
    const { email, name, glidCookieValue, ipAddress, userAgent } = inputData;

    const foundUser: UserEntity = await this._dbContext.userRepository.findOneUserByEmail(
      email,
      ExternalRegistrationProviderEnum.GOOGLE,
    );
    if (foundUser) {
      if (foundUser.name !== name && name) {
        foundUser.name = name;
        await this._dbContext.userRepository.saveUserEntity(foundUser);
      }
      await this.recordSignInAudit(email, foundUser.id, SignInStatusEnum.SUCCESS, ipAddress, userAgent);
      return foundUser;
    }
    const userData: RegisterUserDs = {
      email: email,
      gclidValue: glidCookieValue,
      password: null,
      isActive: true,
      name: name ? name : null,
    };
    const savedUser = await this._dbContext.userRepository.saveRegisteringUser(
      userData,
      ExternalRegistrationProviderEnum.GOOGLE,
    );
    await this.demoDataService.createDemoDataForUser(savedUser.id);
    await this.recordSignInAudit(email, savedUser.id, SignInStatusEnum.SUCCESS, ipAddress, userAgent);
    return savedUser;
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
        signInMethod: SignInMethodEnum.GOOGLE,
        ipAddress,
        userAgent,
        failureReason,
      });
    } catch (e) {
      console.error('Failed to record sign-in audit:', e);
    }
  }
}
