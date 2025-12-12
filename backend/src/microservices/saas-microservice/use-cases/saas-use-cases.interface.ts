import { CompanyInfoEntity } from '../../../entities/company-info/company-info.entity.js';
import { SaaSRegisterDemoUserAccountDS } from '../../../entities/user/application/data-structures/demo-user-account-register.ds.js';
import { SaasUsualUserRegisterDS } from '../../../entities/user/application/data-structures/usual-register-user.ds.js';
import { FoundUserDto } from '../../../entities/user/dto/found-user.dto.js';
import { UserEntity } from '../../../entities/user/user.entity.js';
import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { SuccessResponse } from '../data-structures/common-responce.ds.js';
import { FreezeConnectionsInCompanyDS } from '../data-structures/freeze-connections-in-company.ds.js';
import { GetUserInfoByIdDS } from '../data-structures/get-user-info.ds.js';
import { GetUsersInfosByEmailDS } from '../data-structures/get-users-infos-by-email.ds.js';
import { RegisterCompanyWebhookDS } from '../data-structures/register-company.ds.js';
import { RegisteredCompanyDS } from '../data-structures/registered-company.ds.js';
import { SaasRegisterUserWithGithub } from '../data-structures/saas-register-user-with-github.js';
import { SaasSAMLUserRegisterDS } from '../data-structures/saas-saml-user-register.ds.js';
import { SaasRegisterUserWithGoogleDS } from '../data-structures/sass-register-user-with-google.js';
import { SuspendUsersDS } from '../data-structures/suspend-users.ds.js';

export interface ICompanyRegistration {
  execute(inputData: RegisterCompanyWebhookDS): Promise<RegisteredCompanyDS>;
}

export interface IGetUserInfo {
  execute(userData: GetUserInfoByIdDS): Promise<UserEntity>;
}

export interface ISaasGetUsersInfosByEmail {
  execute(userData: GetUsersInfosByEmailDS): Promise<UserEntity[]>;
}

export interface ISaasRegisterUser {
  execute(userData: SaasUsualUserRegisterDS): Promise<FoundUserDto>;
}

export interface ISaasDemoRegisterUser {
  execute(userData: SaaSRegisterDemoUserAccountDS): Promise<FoundUserDto>;
}

export interface ILoginUserWithGoogle {
  execute(inputData: SaasRegisterUserWithGoogleDS, inTransaction: InTransactionEnum): Promise<UserEntity>;
}

export interface ILoginUserWithGitHub {
  execute(userData: SaasRegisterUserWithGithub): Promise<UserEntity>;
}

export interface ISuspendUsers {
  execute(usersData: SuspendUsersDS): Promise<void>;
}

export interface ISuspendUsersOverLimit {
  execute(companyId: string): Promise<void>;
}

export interface ISaaSGetCompanyInfoByUserId {
  execute(userId: string): Promise<CompanyInfoEntity>;
}

export interface ISaaSGetUsersCountInCompany {
  execute(companyId: string): Promise<number>;
}

export interface IFreezeConnectionsInCompany {
  execute(inputData: FreezeConnectionsInCompanyDS): Promise<SuccessResponse>;
}

export interface ISaasSAMLRegisterUser {
  execute(userData: SaasSAMLUserRegisterDS): Promise<UserEntity>;
}
