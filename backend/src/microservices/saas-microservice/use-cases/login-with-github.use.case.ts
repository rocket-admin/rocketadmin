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

@Injectable()
export class LoginUserWithGithubUseCase
  extends AbstractUseCase<SaasRegisterUserWithGithub, UserEntity>
  implements ILoginUserWithGitHub
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly demoDataService: DemoDataService,
  ) {
    super();
  }

  protected async implementation(inputData: SaasRegisterUserWithGithub): Promise<UserEntity> {
    const { email, githubId, glidCookieValue, name } = inputData;
    const foundUser: UserEntity = await this._dbContext.userRepository.findOneUserByGitHubId(githubId);
    if (foundUser) {
      if (foundUser.name !== name && name) {
        foundUser.name = name;
      }
      if (foundUser.email !== email) {
        foundUser.email = email;
      }
      await this._dbContext.userRepository.saveUserEntity(foundUser);
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

      return savedUser;
    } catch (_e) {
      throw new InternalServerErrorException(Messages.GITHUB_REGISTRATION_FAILED);
    }
  }
}
