import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { DemoDataService } from '../../../entities/demo-data/demo-data.service.js';
import { RegisterUserDs } from '../../../entities/user/application/data-structures/register-user-ds.js';
import { ExternalRegistrationProviderEnum } from '../../../entities/user/enums/external-registration-provider.enum.js';
import { UserRoleEnum } from '../../../entities/user/enums/user-role.enum.js';
import { UserEntity } from '../../../entities/user/user.entity.js';
import { buildUserGitHubIdentifierEntity } from '../../../entities/user/utils/build-github-identifier-entity.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SaasRegisterUserWithGithub } from '../data-structures/saas-register-user-with-github.js';
import { ILoginUserWithGitHub } from './saas-use-cases.interface.js';
import { SignInAuditService } from '../../../entities/user-sign-in-audit/sign-in-audit.service.js';
import { SignInStatusEnum } from '../../../entities/user-sign-in-audit/enums/sign-in-status.enum.js';
import { SignInMethodEnum } from '../../../entities/user-sign-in-audit/enums/sign-in-method.enum.js';

@Injectable()
export class LoginUserWithGithubUseCase
  extends AbstractUseCase<SaasRegisterUserWithGithub, UserEntity>
  implements ILoginUserWithGitHub
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly demoDataService: DemoDataService,
    private readonly signInAuditService: SignInAuditService,
  ) {
    super();
  }

  protected async implementation(inputData: SaasRegisterUserWithGithub): Promise<UserEntity> {
    const { email, githubId, glidCookieValue, name, ipAddress, userAgent } = inputData;
    const foundUser: UserEntity = await this._dbContext.userRepository.findOneUserByGitHubId(githubId);
    if (foundUser) {
      if (foundUser.name !== name && name) {
        foundUser.name = name;
      }
      if (foundUser.email !== email) {
        foundUser.email = email;
      }
      await this._dbContext.userRepository.saveUserEntity(foundUser);
      await this.recordSignInAudit(email, foundUser.id, SignInStatusEnum.SUCCESS, ipAddress, userAgent);
      return foundUser;
    }
    const userData: RegisterUserDs = {
      email: email,
      gclidValue: glidCookieValue,
      password: null,
      isActive: true,
      name: name ? name : null,
      role: UserRoleEnum.ADMIN,
    };

    try {
      const savedUser = await this._dbContext.userRepository.saveRegisteringUser(
        userData,
        ExternalRegistrationProviderEnum.GITHUB,
      );

      const newUserGitHubIdentifier = buildUserGitHubIdentifierEntity(savedUser, Number(githubId));
      await this._dbContext.userGitHubIdentifierRepository.saveGitHubIdentifierEntity(newUserGitHubIdentifier);

      await this.demoDataService.createDemoDataForUser(savedUser.id);

      await this.recordSignInAudit(email, savedUser.id, SignInStatusEnum.SUCCESS, ipAddress, userAgent);

      return savedUser;
    } catch (_e) {
      await this.recordSignInAudit(
        email,
        null,
        SignInStatusEnum.FAILED,
        ipAddress,
        userAgent,
        Messages.GITHUB_REGISTRATION_FAILED,
      );
      throw new InternalServerErrorException(Messages.GITHUB_REGISTRATION_FAILED);
    }
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
        signInMethod: SignInMethodEnum.GITHUB,
        ipAddress,
        userAgent,
        failureReason,
      });
    } catch (e) {
      console.error('Failed to record sign-in audit:', e);
    }
  }
}
