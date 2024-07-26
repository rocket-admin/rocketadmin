import { FoundUserDto } from '../../../entities/user/dto/found-user.dto.js';
import {
  RegisterInvitedUserDS,
  SaasUsualUserRegisterDS,
} from '../../../entities/user/application/data-structures/usual-register-user.ds.js';
import { UserEntity } from '../../../entities/user/user.entity.js';
import { AddRemoveCompanyIdToUserDS } from '../data-structures/add-company-id-to-user.ds.js';
import { GetUserInfoByEmailDS } from '../data-structures/get-user-info.ds.js';
import { GetUsersInfosByEmailDS } from '../data-structures/get-users-infos-by-email.ds.js';
import { RegisterCompanyWebhookDS } from '../data-structures/register-company.ds.js';
import { RegisteredCompanyDS } from '../data-structures/registered-company.ds.js';
import { SaasRegisterUserWithGithub } from '../data-structures/saas-register-user-with-github.js';
import { SaasRegisterUserWithGoogleDS } from '../data-structures/sass-register-user-with-google.js';
import { SuspendUsersDS } from '../data-structures/suspend-users.ds.js';

export interface ICompanyRegistration {
  execute(inputData: RegisterCompanyWebhookDS): Promise<RegisteredCompanyDS>;
}

export interface IGetUserInfo {
  execute(userId: string): Promise<UserEntity>;
}

export interface IGetUserInfoByEmail {
  execute(inputData: GetUserInfoByEmailDS): Promise<UserEntity>;
}

export interface ISaasGetUsersInfosByEmail {
  execute(userData: GetUsersInfosByEmailDS): Promise<UserEntity[]>;
}

export interface ISaasRegisterUser {
  execute(userData: SaasUsualUserRegisterDS): Promise<FoundUserDto>;
}

export interface ISaaSRegisterInvitedUser {
  execute(userData: RegisterInvitedUserDS): Promise<FoundUserDto>;
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

export interface IAddOrRemoveCompanyIdToUser {
  execute(inputData: AddRemoveCompanyIdToUserDS): Promise<void>;
}

export interface ISuspendUsers {
  execute(usersData: SuspendUsersDS): Promise<void>;
}
