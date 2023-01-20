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
import { GoogleLoginDs } from './application/data-structures/google-login.ds.js';
import { OperationResultMessageDs } from './application/data-structures/operation-result-message.ds.js';
import { RegisteredUserDs } from './application/data-structures/registered-user.ds.js';
import { ResetUsualUserPasswordDs } from './application/data-structures/reset-usual-user-password.ds.js';
import { UpgradeUserSubscriptionDs } from './application/data-structures/upgrade-user-subscription.ds.js';
import { UsualLoginDs } from './application/data-structures/usual-login.ds.js';
import { UsualRegisterUserDs } from './application/data-structures/usual-register-user.ds.js';
import { ChangeUsualUserPasswordDto, EmailDto, LoginUserDto, PasswordDto, SocialNetworkLoginDto } from './dto/index.js';
import { ChangeUserNameDTO } from './dto/change-user-name.dto.js';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto.js';
import { UsualRegisterUserDto } from './dto/usual-register-user.dto.js';
import {
  IChangeUserName,
  IDeleteUserAccount,
  IFacebookLogin,
  IFindUserUseCase,
  IGoogleLogin,
  ILogOut,
  IRequestEmailChange,
  IRequestEmailVerification,
  IRequestPasswordReset,
  IUpgradeSubscription,
  IUsualLogin,
  IUsualPasswordChange,
  IUsualRegister,
  IVerifyEmail,
  IVerifyEmailChange,
  IVerifyPasswordReset,
} from './use-cases/user-use-cases.interfaces.js';
import { ITokenExp } from './utils/generate-gwt-token.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@Injectable()
export class UserController {
  constructor(
    @Inject(UseCaseType.FIND_USER)
    private readonly findUserUseCase: IFindUserUseCase,
    @Inject(UseCaseType.UPGRADE_USER_SUBSCRIPTION)
    private readonly upgradeUserSubscriptionUseCase: IUpgradeSubscription,
    @Inject(UseCaseType.USUAL_LOGIN)
    private readonly usualLoginUseCase: IUsualLogin,
    @Inject(UseCaseType.USUAL_REGISTER)
    private readonly usualRegisterUseCase: IUsualRegister,
    @Inject(UseCaseType.LOG_OUT)
    private readonly logOutUseCase: ILogOut,
    @Inject(UseCaseType.GOOGLE_LOGIN)
    private readonly googleLoginUseCase: IGoogleLogin,
    @Inject(UseCaseType.FACEBOOK_LOGIN)
    private readonly facebookLoginUseCase: IFacebookLogin,
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
  ) {}

  @Get('user')
  async findMe(@UserId() userId: string, @GCLlId() glidCookieValue: string): Promise<FoundUserDs> {
    const findUserDs: FindUserDs = {
      id: userId,
      gclidValue: glidCookieValue,
    };

    return await this.findUserUseCase.execute(findUserDs, InTransactionEnum.OFF);
  }

  @Post('user/subscription/upgrade')
  async upgradeSubscription(
    @Body('subscriptionLevel') subscriptionLevel: SubscriptionLevelEnum,
    @UserId() userId: string,
  ): Promise<any> {
    if (!validateStringWithEnum(subscriptionLevel, SubscriptionLevelEnum)) {
      throw new HttpException(
        {
          message: Messages.SUBSCRIPTION_TYPE_INCORRECT(subscriptionLevel),
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

  @Post('user/login/')
  async usualLogin(
    @Res({ passthrough: true }) response: Response,
    @BodyEmail('email') email: string,
    @Body('password') password: string,
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
    };

    const tokenInfo = await this.usualLoginUseCase.execute(userData, InTransactionEnum.OFF);
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, tokenInfo.token);
    return { expires: tokenInfo.exp };
  }

  @Post('user/register/')
  async usualRegister(
    @GCLlId() glidCookieValue: string,
    @Res({ passthrough: true }) response: Response,
    @BodyEmail('email') email: string,
    @Body('password') password: string,
    @Body('name') name: string,
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
    const inputData: UsualRegisterUserDs = {
      email: email,
      password: password,
      gclidValue: glidCookieValue,
      name: name,
    };
    const tokenInfo = await this.usualRegisterUseCase.execute(inputData, InTransactionEnum.ON);
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, tokenInfo.token);
    return { expires: tokenInfo.exp };
  }

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
    return await this.logOutUseCase.execute(token, InTransactionEnum.ON);
  }

  @Post('user/google/login/')
  async registerWithGoogle(
    @GCLlId() gclidCookieValue: string,
    @Res({ passthrough: true }) response: Response,
    @Body('token') token: string,
  ): Promise<ITokenExp> {
    if (!token) {
      throw new HttpException(
        {
          message: Messages.TOKEN_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const googleLoginDs: GoogleLoginDs = {
      token: token,
      glidCookieValue: gclidCookieValue,
    };
    const tokenInfo = await this.googleLoginUseCase.execute(googleLoginDs, InTransactionEnum.ON);
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, tokenInfo.token);
    return { expires: tokenInfo.exp };
  }

  @Post('user/facebook/login/')
  async registerWithFacebook(@Req() request, @Res({ passthrough: true }) response: Response): Promise<ITokenExp> {
    const token = request.body.token;
    if (!token) {
      throw new HttpException(
        {
          message: Messages.TOKEN_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const tokenInfo = await this.facebookLoginUseCase.execute(token, InTransactionEnum.ON);
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, tokenInfo.token);
    return { expires: tokenInfo.exp };
  }

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
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, tokenInfo.token);
    return { expires: tokenInfo.exp };
  }

  @Get('user/email/verify/request')
  async requestEmailVerification(@UserId() userId: string): Promise<OperationResultMessageDs> {
    return await this.requestEmailVerificationUseCase.execute(userId, InTransactionEnum.ON);
  }

  @Get('user/email/verify/:slug')
  async verifyEmail(@VerificationString() verificationString: string): Promise<OperationResultMessageDs> {
    return await this.verifyEmailUseCase.execute(verificationString, InTransactionEnum.ON);
  }

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

  @Post('user/password/reset/request/')
  async askResetUserPassword(@BodyEmail('email') email: string): Promise<OperationResultMessageDs> {
    return await this.requestResetUserPasswordUseCase.execute(email, InTransactionEnum.ON);
  }

  @Get('user/email/change/request/')
  async askChangeUserEmail(@UserId() userId: string): Promise<OperationResultMessageDs> {
    return await this.requestChangeUserEmailUseCase.execute(userId, InTransactionEnum.ON);
  }

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

  @Put('user/name/')
  async changeUserName(
    @UserId() userId: string,
    @Body('name') name: string,
    @Body('password') password: string,
  ): Promise<FoundUserDs> {
    const inputData: ChangeUserNameDS = {
      id: userId,
      name: name,
      password: password,
    };
    return await this.changeUserNameUseCase.execute(inputData, InTransactionEnum.OFF);
  }

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
}
