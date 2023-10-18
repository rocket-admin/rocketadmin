import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Post,
  Put,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import isEmail from 'validator/lib/isEmail.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { BodyEmail, GCLlId, UserId, VerificationString } from '../../decorators/index.js';
import { InTransactionEnum, SubscriptionLevelEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { slackPostMessage } from '../../helpers/index.js';
import { Constants } from '../../helpers/constants/constants.js';
import { validateStringWithEnum } from '../../helpers/validators/validate-string-with-enum.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { ChangeUserEmailDs } from './application/data-structures/change-user-email.ds.js';
import { ChangeUserNameDS } from './application/data-structures/change-user-name.ds.js';
import { ChangeUsualUserPasswordDs } from './application/data-structures/change-usual-user-password.ds.js';
import { FindUserDs } from './application/data-structures/find-user.ds.js';
import { FoundUserDs } from './application/data-structures/found-user.ds.js';
import { OperationResultMessageDs } from './application/data-structures/operation-result-message.ds.js';
import { RegisteredUserDs } from './application/data-structures/registered-user.ds.js';
import { ResetUsualUserPasswordDs } from './application/data-structures/reset-usual-user-password.ds.js';
import { UpgradeUserSubscriptionDs } from './application/data-structures/UpgradeUserSubscriptionDs.js';
import { UsualLoginDs } from './application/data-structures/usual-login.ds.js';
import {
  IAddStripeSetupIntent,
  IChangeUserName,
  IDeleteUserAccount,
  IDisableOTP,
  IFindUserUseCase,
  IGenerateOTP,
  IGetStripeIntentId,
  ILogOut,
  IOtpLogin,
  IRequestEmailChange,
  IRequestEmailVerification,
  IRequestPasswordReset,
  IUpgradeSubscription,
  IUsualLogin,
  IUsualPasswordChange,
  IVerifyEmail,
  IVerifyEmailChange,
  IVerifyOTP,
  IVerifyPasswordReset,
} from './use-cases/user-use-cases.interfaces.js';
import { ITokenExp, TokenExpDs } from './utils/generate-gwt-token.js';
import { OtpSecretDS } from './application/data-structures/otp-secret.ds.js';
import { OtpDisablingResultDS, OtpValidationResultDS } from './application/data-structures/otp-validation-result.ds.js';
import { StripeIntentDs } from './application/data-structures/stripe-intent-id.ds.js';
import { AddStripeSetupIntentDs } from './application/data-structures/add-stripe-setup-intent.ds.js';
import { getCookieDomainOptions } from './utils/get-cookie-domain-options.js';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpgradedUserSubscriptionDs } from './application/data-structures/upgraded-user-subscription.ds.js';
import { PasswordDto } from './dto/password.dto.js';
import { EmailDto } from './dto/email.dto.js';
import { DeleteUserAccountDTO } from './dto/delete-user-account-request.dto.js';
import { VerifyOtpDS } from './application/data-structures/verify-otp.ds.js';
import { AddedStripeSetupIntentDs } from './application/data-structures/added-stripe-setup-intent.ds.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('user')
@Injectable()
export class UserController {
  constructor(
    @Inject(UseCaseType.FIND_USER)
    private readonly findUserUseCase: IFindUserUseCase,
    @Inject(UseCaseType.UPGRADE_USER_SUBSCRIPTION)
    private readonly upgradeUserSubscriptionUseCase: IUpgradeSubscription,
    @Inject(UseCaseType.USUAL_LOGIN)
    private readonly usualLoginUseCase: IUsualLogin,
    @Inject(UseCaseType.LOG_OUT)
    private readonly logOutUseCase: ILogOut,
    @Inject(UseCaseType.CHANGE_USUAL_PASSWORD)
    private readonly changeUsualPasswordUseCase: IUsualPasswordChange,
    @Inject(UseCaseType.VERIFY_EMAIL)
    private readonly verifyEmailUseCase: IVerifyEmail,
    @Inject(UseCaseType.VERIFY_RESET_USER_PASSWORD)
    private readonly verifyResetUserPasswordUseCase: IVerifyPasswordReset,
    @Inject(UseCaseType.REQUEST_RESET_USER_PASSWORD)
    private readonly requestResetUserPasswordUseCase: IRequestPasswordReset,
    @Inject(UseCaseType.REQUEST_CHANGE_USER_EMAIL)
    private readonly requestChangeUserEmailUseCase: IRequestEmailChange,
    @Inject(UseCaseType.VERIFY_EMAIL_CHANGE)
    private readonly verifyChangeUserEmailUseCase: IVerifyEmailChange,
    @Inject(UseCaseType.VERIFY_EMAIL_REQUEST)
    private readonly requestEmailVerificationUseCase: IRequestEmailVerification,
    @Inject(UseCaseType.DELETE_USER_ACCOUNT)
    private readonly deleteUserAccountUseCase: IDeleteUserAccount,
    @Inject(UseCaseType.CHANGE_USER_NAME)
    private readonly changeUserNameUseCase: IChangeUserName,
    @Inject(UseCaseType.GENERATE_OTP)
    private readonly generateOtpUseCase: IGenerateOTP,
    @Inject(UseCaseType.VERIFY_OTP)
    private readonly verifyOtpUseCase: IVerifyOTP,
    @Inject(UseCaseType.OTP_LOGIN)
    private readonly otpLoginUseCase: IOtpLogin,
    @Inject(UseCaseType.DISABLE_OTP)
    private readonly disableOtpUseCase: IDisableOTP,
    @Inject(UseCaseType.GET_STRIPE_INTENT_ID)
    private readonly getStripeIntentIdUseCase: IGetStripeIntentId,
    @Inject(UseCaseType.ADD_STRIPE_SETUP_INTENT_TO_CUSTOMER)
    private readonly addSetupIntentToCustomerUseCase: IAddStripeSetupIntent,
  ) {}

  @ApiOperation({ summary: 'Get user' })
  @ApiResponse({
    status: 200,
    description: 'Returns found user.',
    type: FoundUserDs,
  })
  @Get('user')
  async findMe(@UserId() userId: string, @GCLlId() glidCookieValue: string): Promise<FoundUserDs> {
    const findUserDs: FindUserDs = {
      id: userId,
      gclidValue: glidCookieValue,
    };

    return await this.findUserUseCase.execute(findUserDs, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Upgrade user subscription' })
  @ApiBody({ type: UpgradeUserSubscriptionDs })
  @ApiResponse({
    status: 200,
    description: 'Upgrade user subscription.',
    type: FoundUserDs,
  })
  @Post('user/subscription/upgrade')
  async upgradeSubscription(
    @Body('subscriptionLevel') subscriptionLevel: SubscriptionLevelEnum,
    @UserId() userId: string,
  ): Promise<UpgradedUserSubscriptionDs> {
    if (!validateStringWithEnum(subscriptionLevel, SubscriptionLevelEnum)) {
      throw new HttpException(
        {
          message: Messages.SUBSCRIPTION_TYPE_INCORRECT(),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: UpgradeUserSubscriptionDs = {
      subscriptionLevel: subscriptionLevel,
      cognitoUserName: userId,
    };
    return await this.upgradeUserSubscriptionUseCase.execute(inputData, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: UsualLoginDs })
  @ApiResponse({
    status: 201,
    description: 'Login with email and password.',
    type: TokenExpDs,
  })
  @Post('user/login/')
  async usualLogin(
    @Res({ passthrough: true }) response: Response,
    @BodyEmail('email') email: string,
    @Body('password') password: string,
    @Body('companyId') userCompanyId: string,
  ): Promise<ITokenExp> {
    if (!email) {
      throw new HttpException(
        {
          message: Messages.EMAIL_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const emailValidationResult = isEmail(email);
    if (!emailValidationResult) {
      throw new HttpException(
        {
          message: Messages.EMAIL_INVALID,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!password) {
      throw new HttpException(
        {
          message: Messages.PASSWORD_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const userData: UsualLoginDs = {
      email: email,
      password: password,
      gclidValue: null,
      companyId: userCompanyId,
    };

    const tokenInfo = await this.usualLoginUseCase.execute(userData, InTransactionEnum.OFF);

    response.cookie(Constants.JWT_COOKIE_KEY_NAME, tokenInfo.token, {
      httpOnly: true,
      secure: true,
      expires: tokenInfo.exp,
    });
    response.cookie(Constants.ROCKETADMIN_AUTHENTICATED_COOKIE, 1, {
      httpOnly: false,
      ...getCookieDomainOptions(),
    });
    return { expires: tokenInfo.exp, isTemporary: tokenInfo.isTemporary };
  }

  @ApiOperation({ summary: 'Log out' })
  @ApiResponse({
    status: 201,
    description: 'Log out.',
  })
  @Post('user/logout/')
  async logOut(@Req() request, @Res({ passthrough: true }) response: Response): Promise<any> {
    const token = request.cookies[Constants.JWT_COOKIE_KEY_NAME];
    if (!token) {
      throw new HttpException(
        {
          message: Messages.TOKEN_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, '');
    response.cookie(Constants.ROCKETADMIN_AUTHENTICATED_COOKIE, 1, {
      httpOnly: false,
      ...getCookieDomainOptions(),
    });
    return await this.logOutUseCase.execute(token, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Change user password' })
  @ApiBody({ type: ChangeUsualUserPasswordDs })
  @ApiResponse({
    status: 201,
    description: 'Change user password.',
    type: TokenExpDs,
  })
  @Post('user/password/change/')
  async changeUsualPassword(
    @Res({ passthrough: true }) response: Response,
    @BodyEmail('email') email: string,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
  ): Promise<ITokenExp> {
    if (!email) {
      throw new HttpException(
        {
          message: Messages.EMAIL_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!oldPassword) {
      throw new HttpException(
        {
          message: Messages.PASSWORD_OLD_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!newPassword) {
      throw new HttpException(
        {
          message: Messages.PASSWORD_NEW_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: ChangeUsualUserPasswordDs = {
      email: email,
      newPassword: newPassword,
      oldPassword: oldPassword,
    };
    const tokenInfo = await this.changeUsualPasswordUseCase.execute(inputData, InTransactionEnum.ON);
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, tokenInfo.token, {
      httpOnly: true,
      secure: true,
      expires: tokenInfo.exp,
    });
    response.cookie(Constants.ROCKETADMIN_AUTHENTICATED_COOKIE, 1, {
      httpOnly: false,
      ...getCookieDomainOptions(),
    });
    return { expires: tokenInfo.exp, isTemporary: tokenInfo.isTemporary };
  }

  @ApiOperation({ summary: 'Request user email verification' })
  @ApiResponse({
    status: 200,
    description: 'Request user email verification.',
    type: OperationResultMessageDs,
  })
  @Get('user/email/verify/request')
  async requestEmailVerification(@UserId() userId: string): Promise<OperationResultMessageDs> {
    return await this.requestEmailVerificationUseCase.execute(userId, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Verify user email' })
  @ApiResponse({
    status: 200,
    description: 'Verify user email.',
    type: OperationResultMessageDs,
  })
  @Get('user/email/verify/:slug')
  async verifyEmail(@VerificationString() verificationString: string): Promise<OperationResultMessageDs> {
    return await this.verifyEmailUseCase.execute(verificationString, InTransactionEnum.ON);
  }

  //todo: make admin endpoint
  @ApiOperation({ summary: 'Verify user password reset' })
  @ApiBody({ type: PasswordDto })
  @ApiResponse({
    status: 201,
    description: 'Verify user password reset.',
    type: RegisteredUserDs,
  })
  @Post('user/password/reset/verify/:slug')
  async resetUserPassword(
    @Body('password') password: string,
    @VerificationString() verificationString: string,
  ): Promise<RegisteredUserDs> {
    const inputData: ResetUsualUserPasswordDs = {
      verificationString: verificationString,
      newUserPassword: password,
    };
    return await this.verifyResetUserPasswordUseCase.execute(inputData, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Request user password reset' })
  @ApiBody({ type: EmailDto })
  @ApiResponse({
    status: 201,
    description: 'Request user password reset.',
    type: OperationResultMessageDs,
  })
  @Post('user/password/reset/request/')
  async askResetUserPassword(@BodyEmail('email') email: string): Promise<OperationResultMessageDs> {
    return await this.requestResetUserPasswordUseCase.execute(email, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Request user email change' })
  @ApiResponse({
    status: 200,
    description: 'Request user email change.',
    type: OperationResultMessageDs,
  })
  @Get('user/email/change/request/')
  async askChangeUserEmail(@UserId() userId: string): Promise<OperationResultMessageDs> {
    return await this.requestChangeUserEmailUseCase.execute(userId, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Verify user email change' })
  @ApiBody({ type: EmailDto })
  @ApiResponse({
    status: 201,
    description: 'Verify user email change.',
    type: OperationResultMessageDs,
  })
  @Post('user/email/change/verify/:slug')
  async verifyChangeUserEmail(
    @BodyEmail('email') email: string,
    @VerificationString() verificationString: string,
  ): Promise<OperationResultMessageDs> {
    const inputData: ChangeUserEmailDs = {
      newEmail: email,
      verificationString: verificationString,
    };
    if (!email || !isEmail(email)) {
      throw new HttpException(
        {
          message: Messages.EMAIL_INVALID,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.verifyChangeUserEmailUseCase.execute(inputData, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Change user name' })
  @ApiBody({ type: ChangeUserNameDS })
  @ApiResponse({
    status: 200,
    description: 'Change user name.',
    type: FoundUserDs,
  })
  @Put('user/name/')
  async changeUserName(@UserId() userId: string, @Body('name') name: string): Promise<FoundUserDs> {
    const inputData: ChangeUserNameDS = {
      id: userId,
      name: name,
    };
    return await this.changeUserNameUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Delete user account' })
  @ApiBody({ type: DeleteUserAccountDTO })
  @ApiResponse({
    status: 200,
    description: 'Delete user account.',
    type: RegisteredUserDs,
  })
  @Put('user/delete/')
  async deleteUser(
    @UserId() userId: string,
    @Body('reason') reason: string,
    @Body('message') message: string,
  ): Promise<Omit<RegisteredUserDs, 'token'>> {
    const deleteResult = await this.deleteUserAccountUseCase.execute(userId, InTransactionEnum.ON);
    const slackMessage = Messages.USER_DELETED_ACCOUNT(deleteResult.email, reason, message);
    await slackPostMessage(slackMessage);
    return deleteResult;
  }

  @ApiOperation({ summary: 'Generate one time token and qr' })
  @ApiResponse({
    status: 201,
    description: 'Generate one time token and qr.',
    type: OtpSecretDS,
  })
  @Post('user/otp/generate/')
  async generateOtp(@UserId() userId: string): Promise<OtpSecretDS> {
    return await this.generateOtpUseCase.execute(userId, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Verify one time token' })
  @ApiBody({ type: VerifyOtpDS })
  @ApiResponse({
    status: 201,
    description: 'Verify one time token.',
    type: OtpValidationResultDS,
  })
  @Post('user/otp/verify/')
  async verifyOtp(@UserId() userId: string, @Body('otpToken') otpToken: string): Promise<OtpValidationResultDS> {
    return await this.verifyOtpUseCase.execute({ userId, otpToken }, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Disable user 2fa authentication' })
  @ApiBody({ type: VerifyOtpDS })
  @ApiResponse({
    status: 201,
    description: 'Disable user 2fa authentication.',
    type: OtpDisablingResultDS,
  })
  @Post('user/otp/disable/')
  async disableOtp(@UserId() userId: string, @Body('otpToken') otpToken: string): Promise<OtpDisablingResultDS> {
    return await this.disableOtpUseCase.execute({ userId, otpToken }, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Validate 2fa token for login with second factor' })
  @ApiBody({ type: VerifyOtpDS })
  @ApiResponse({
    status: 201,
    description: 'Validate 2fa token for login with second factor.',
    type: TokenExpDs,
  })
  @Post('user/otp/login/')
  async validateOtp(
    @Res({ passthrough: true }) response: Response,
    @UserId() userId: string,
    @Body('otpToken') otpToken: string,
  ): Promise<any> {
    const tokenInfo = await this.otpLoginUseCase.execute({ userId, otpToken }, InTransactionEnum.OFF);
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, tokenInfo.token, {
      httpOnly: true,
      secure: true,
      expires: tokenInfo.exp,
    });
    response.cookie(Constants.ROCKETADMIN_AUTHENTICATED_COOKIE, 1, {
      httpOnly: false,
      ...getCookieDomainOptions(),
    });
    return {
      expires: tokenInfo.exp,
      isTemporary: tokenInfo.isTemporary,
    };
  }

  @ApiOperation({ summary: 'Create user stripe setup intent' })
  @ApiBody({ type: VerifyOtpDS })
  @ApiResponse({
    status: 201,
    description: 'Create user stripe setup intent.',
    type: StripeIntentDs,
  })
  @Post('user/stripe/intent')
  async getStripeIntent(@UserId() userId: string): Promise<StripeIntentDs> {
    return await this.getStripeIntentIdUseCase.execute(userId, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Add stripe setup intent to user' })
  @ApiBody({ type: AddStripeSetupIntentDs })
  @ApiResponse({
    status: 201,
    description: 'Add stripe setup intent to user.',
    type: StripeIntentDs,
  })
  @Post('user/setup/intent')
  async addSetupIntentToCustomer(
    @UserId() userId: string,
    @Body('defaultPaymentMethodId') defaultPaymentMethodId: string,
    @Body('subscriptionLevel') subscriptionLevel: SubscriptionLevelEnum,
  ): Promise<AddedStripeSetupIntentDs> {
    if (!validateStringWithEnum(subscriptionLevel, SubscriptionLevelEnum)) {
      throw new HttpException(
        {
          message: Messages.SUBSCRIPTION_TYPE_INCORRECT(),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: AddStripeSetupIntentDs = {
      userId: userId,
      defaultPaymentMethodId: defaultPaymentMethodId,
      subscriptionLevel: subscriptionLevel,
    };
    return await this.addSetupIntentToCustomerUseCase.execute(inputData, InTransactionEnum.OFF);
  }
}
