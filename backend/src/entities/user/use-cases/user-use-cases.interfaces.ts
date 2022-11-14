import { InTransactionEnum } from '../../../enums';
import { ChangeUserEmailDs } from '../application/data-structures/change-user-email.ds';
import { ChangeUserNameDS } from '../application/data-structures/change-user-name.ds';
import { ChangeUsualUserPasswordDs } from '../application/data-structures/change-usual-user-password.ds';
import { CreateUserDs } from '../application/data-structures/create-user.ds';
import { CreatedUserDs } from '../application/data-structures/created-user.ds';
import { FindUserDs } from '../application/data-structures/find-user.ds';
import { FoundUserDs } from '../application/data-structures/found-user.ds';
import { GoogleLoginDs } from '../application/data-structures/google-login.ds';
import { OperationResultMessageDs } from '../application/data-structures/operation-result-message.ds';
import { RegisteredUserDs } from '../application/data-structures/registered-user.ds';
import { ResetUsualUserPasswordDs } from '../application/data-structures/reset-usual-user-password.ds';
import { UpgradeUserSubscriptionDs } from '../application/data-structures/upgrade-user-subscription.ds';
import { UpgradedUserSubscriptionDs } from '../application/data-structures/upgraded-user-subscription.ds';
import { UsualLoginDs } from '../application/data-structures/usual-login.ds';
import { IToken } from '../utils/generate-gwt-token';

export interface ICreateUserUseCase {
  execute(userData: CreateUserDs): Promise<CreatedUserDs>;
}

export interface IFindUserUseCase {
  execute(userData: FindUserDs | CreateUserDs, inTransaction: InTransactionEnum): Promise<FoundUserDs>;
}

export interface IUpgradeSubscription {
  execute(inputData: UpgradeUserSubscriptionDs, inTransaction: InTransactionEnum): Promise<UpgradedUserSubscriptionDs>;
}

export interface IUsualLogin {
  execute(userData: UsualLoginDs, inTransaction: InTransactionEnum): Promise<IToken>;
}

export interface IUsualRegister {
  execute(userData: UsualLoginDs, inTransaction: InTransactionEnum): Promise<IToken>;
}

export interface ILogOut {
  execute(token: string, inTransaction: InTransactionEnum): Promise<boolean>;
}

export interface IGoogleLogin {
  execute(inputData: GoogleLoginDs, inTransaction: InTransactionEnum): Promise<IToken>;
}

export interface IFacebookLogin {
  execute(facebookToken: string, inTransaction: InTransactionEnum): Promise<IToken>;
}

export interface IUsualPasswordChange {
  execute(inputData: ChangeUsualUserPasswordDs, inTransaction: InTransactionEnum): Promise<IToken>;
}

export interface IVerifyEmail {
  execute(verificationString: string, inTransaction: InTransactionEnum): Promise<OperationResultMessageDs>;
}

export interface IVerifyPasswordReset {
  execute(inputData: ResetUsualUserPasswordDs, inTransaction: InTransactionEnum): Promise<RegisteredUserDs>;
}

export interface IRequestPasswordReset {
  execute(userId: string, inTransaction: InTransactionEnum): Promise<OperationResultMessageDs>;
}

export interface IRequestEmailChange {
  execute(userId: string, inTransaction: InTransactionEnum): Promise<OperationResultMessageDs>;
}

export interface IVerifyEmailChange {
  execute(inputData: ChangeUserEmailDs, inTransaction: InTransactionEnum): Promise<OperationResultMessageDs>;
}

export interface IRequestEmailVerification {
  execute(userId: string, inTransaction: InTransactionEnum): Promise<OperationResultMessageDs>;
}

export interface IDeleteUserAccount {
  execute(userId: string, inTransaction: InTransactionEnum): Promise<Omit<RegisteredUserDs, 'token'>>;
}

export interface IChangeUserName {
  execute(inputData: ChangeUserNameDS, inTransaction: InTransactionEnum): Promise<FoundUserDs>;
}
