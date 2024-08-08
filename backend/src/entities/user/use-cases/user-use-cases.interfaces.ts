import { InTransactionEnum } from '../../../enums/index.js';
import { ChangeUserEmailDs } from '../application/data-structures/change-user-email.ds.js';
import { ChangeUserNameDS } from '../application/data-structures/change-user-name.ds.js';
import { ChangeUsualUserPasswordDs } from '../application/data-structures/change-usual-user-password.ds.js';
import { CreateUserDs } from '../application/data-structures/create-user.ds.js';
import { CreatedUserDs } from '../application/data-structures/created-user.ds.js';
import { FindUserDs } from '../application/data-structures/find-user.ds.js';
import { FoundUserDto } from '../dto/found-user.dto.js';
import { GoogleLoginDs } from '../application/data-structures/google-login.ds.js';
import { OperationResultMessageDs } from '../application/data-structures/operation-result-message.ds.js';
import { OtpSecretDS } from '../application/data-structures/otp-secret.ds.js';
import {
  OtpDisablingResultDS,
  OtpValidationResultDS,
} from '../application/data-structures/otp-validation-result.ds.js';
import { RegisteredUserDs } from '../application/data-structures/registered-user.ds.js';
import { ResetUsualUserPasswordDs } from '../application/data-structures/reset-usual-user-password.ds.js';
import { SaveUserSettingsDs } from '../application/data-structures/save-user-settings.ds.js';
import { UsualLoginDs } from '../application/data-structures/usual-login.ds.js';
import { VerifyOtpDS } from '../application/data-structures/verify-otp.ds.js';
import { IToken } from '../utils/generate-gwt-token.js';
import { RequestRestUserPasswordDto } from '../dto/request-rest-user-password.dto.js';

export interface ICreateUserUseCase {
  execute(userData: CreateUserDs): Promise<CreatedUserDs>;
}

export interface IFindUserUseCase {
  execute(userData: FindUserDs | CreateUserDs, inTransaction: InTransactionEnum): Promise<FoundUserDto>;
}

export interface IUsualLogin {
  execute(userData: UsualLoginDs, inTransaction: InTransactionEnum): Promise<IToken>;
}

export interface IOtpLogin {
  execute(inputData: VerifyOtpDS, inTransaction: InTransactionEnum): Promise<IToken>;
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
  execute(emailData: RequestRestUserPasswordDto, inTransaction: InTransactionEnum): Promise<OperationResultMessageDs>;
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
  execute(inputData: ChangeUserNameDS, inTransaction: InTransactionEnum): Promise<FoundUserDto>;
}

export interface IGenerateOTP {
  execute(userId: string, inTransaction: InTransactionEnum): Promise<OtpSecretDS>;
}

export interface IVerifyOTP {
  execute(inputData: VerifyOtpDS, inTransaction: InTransactionEnum): Promise<OtpValidationResultDS>;
}

export interface IDisableOTP {
  execute(inputData: VerifyOtpDS, inTransaction: InTransactionEnum): Promise<OtpDisablingResultDS>;
}

export interface IGetGitHubLoginLink {
  execute(inTransaction: InTransactionEnum): Promise<string>;
}

export interface IAuthGitHub {
  execute(code: string, inTransaction: InTransactionEnum): Promise<IToken>;
}

export interface ISaveUserSettings {
  execute(settingsData: SaveUserSettingsDs, inTransaction: InTransactionEnum): Promise<SaveUserSettingsDs>;
}

export interface IGetUserSettings {
  execute(userId: string, inTransaction: InTransactionEnum): Promise<SaveUserSettingsDs>;
}
