import { FoundUserDs } from '../../../entities/user/application/data-structures/found-user.ds.js';
import { UsualRegisterUserDs } from '../../../entities/user/application/data-structures/usual-register-user.ds.js';
import { UserEntity } from '../../../entities/user/user.entity.js';
import { RegisterCompanyWebhookDS } from '../data-structures/register-company.ds.js';
import { RegisteredCompanyDS } from '../data-structures/registered-company.ds.js';
import { SaasRegisterUserWithGithub } from '../data-structures/saas-register-user-with-github.js';
import { SaasRegisterUserWithGoogleDS } from '../data-structures/sass-register-user-with-google.js';

export interface ICompanyRegistration {
  execute(inputData: RegisterCompanyWebhookDS): Promise<RegisteredCompanyDS>;
}

export interface IGetUserInfo {
  execute(userId: string): Promise<UserEntity>;
}

export interface ISaasRegisterUser {
  execute(userData: UsualRegisterUserDs): Promise<FoundUserDs>;
}

export interface ILoginUserWithGoogle {
  execute(inputData: SaasRegisterUserWithGoogleDS): Promise<UserEntity>;
}

export interface IGetUserGithubIdInfo {
  execute(githubId: number): Promise<UserEntity>;
}

export interface ILoginUserWithGitHub {
  execute(userData: SaasRegisterUserWithGithub): Promise<UserEntity>;
}
