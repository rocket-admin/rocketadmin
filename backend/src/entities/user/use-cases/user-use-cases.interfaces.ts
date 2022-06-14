import { CreateUserDs } from '../application/data-structures/create-user.ds';
import { CreatedUserDs } from '../application/data-structures/created-user.ds';
import { FindUserDs } from '../application/data-structures/find-user.ds';
import { FoundUserDs } from '../application/data-structures/found-user.ds';
import { UpgradeUserSubscriptionDs } from '../application/data-structures/upgrade-user-subscription.ds';
import { UpgradedUserSubscriptionDs } from '../application/data-structures/upgraded-user-subscription.ds';
import { UsualLoginDs } from '../application/data-structures/usual-login.ds';
import { RegisteredUserDs } from '../application/data-structures/registered-user.ds';
import { GoogleLoginDs } from '../application/data-structures/google-login.ds';
import { ChangeUsualUserPasswordDs } from '../application/data-structures/change-usual-user-password.ds';
import { ResetUsualUserPasswordDs } from '../application/data-structures/reset-usual-user-password.ds';
import { ChangeUserEmailDs } from '../application/data-structures/change-user-email.ds';
import { IToken } from '../utils/generate-gwt-token';
import { OperationResultMessageDs } from '../application/data-structures/operation-result-message.ds';

export interface ICreateUserUseCase {
  execute(userData: CreateUserDs): Promise<CreatedUserDs>;
}

export interface IFindUserUseCase {
  execute(userData: FindUserDs | CreateUserDs): Promise<FoundUserDs>;
}

export interface IUpgradeSubscription {
  execute(inputData: UpgradeUserSubscriptionDs): Promise<UpgradedUserSubscriptionDs>;
}

export interface IUsualLogin {
  execute(userData: UsualLoginDs): Promise<IToken>;
}

export interface IUsualRegister {
  execute(userData: UsualLoginDs): Promise<IToken>;
}

export interface ILogOut {
  execute(token: string): Promise<boolean>;
}

export interface IGoogleLogin {
  execute(inputData: GoogleLoginDs): Promise<IToken>;
}

export interface IFacebookLogin {
  execute(facebookToken: string): Promise<IToken>;
}

export interface IUsualPasswordChange {
  execute(inputData: ChangeUsualUserPasswordDs): Promise<IToken>;
}

export interface IVerifyEmail {
  execute(verificationString: string): Promise<OperationResultMessageDs>;
}

export interface IVerifyPasswordReset {
  execute(inputData: ResetUsualUserPasswordDs): Promise<RegisteredUserDs>;
}

export interface IRequestPasswordReset {
  execute(userId: string): Promise<OperationResultMessageDs>;
}

export interface IRequestEmailChange {
  execute(userId: string): Promise<OperationResultMessageDs>;
}

export interface IVerifyEmailChange {
  execute(inputData: ChangeUserEmailDs): Promise<OperationResultMessageDs>;
}

export interface IRequestEmailVerification {
  execute(userId: string): Promise<OperationResultMessageDs>;
}

export interface IDeleteUserAccount {
  execute(userId: string): Promise<Omit<RegisteredUserDs, 'token'>>;
}
