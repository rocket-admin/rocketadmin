import isEmail from 'validator/lib/isEmail';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Param,
  Post,
  Put,
  Req,
  Res,
  Scope,
  UseInterceptors,
} from '@nestjs/common';
import { findGclidCookieValue, getCognitoUserName } from '../../helpers';
import { IRequestWithCognitoInfo } from '../../authorization';
import { SentryInterceptor } from '../../interceptors';
import { UseCaseType } from '../../common/data-injection.tokens';
import {
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
} from './use-cases/user-use-cases.interfaces';
import { FindUserDs } from './application/data-structures/find-user.ds';
import { FoundUserDs } from './application/data-structures/found-user.ds';
import { AmplitudeEventTypeEnum, SubscriptionLevelEnum } from '../../enums';
import { validateStringWithEnum } from '../../helpers/validators/validate-string-with-enum';
import { Messages } from '../../exceptions/text/messages';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import { UpgradeUserSubscriptionDs } from './application/data-structures/upgrade-user-subscription.ds';
import { ChangeUsualUserPasswordDto, EmailDto, LoginUserDto, PasswordDto, SocialNetworkLoginDto } from './dto';
import { UsualLoginDs } from './application/data-structures/usual-login.ds';
import { RegisteredUserDs } from './application/data-structures/registered-user.ds';
import { GoogleLoginDs } from './application/data-structures/google-login.ds';
import { ChangeUsualUserPasswordDs } from './application/data-structures/change-usual-user-password.ds';
import { ResetUsualUserPasswordDs } from './application/data-structures/reset-usual-user-password.ds';
import { ChangeUserEmailDs } from './application/data-structures/change-user-email.ds';
import { ITokenExp } from './utils/generate-gwt-token';
import { Response } from 'express';
import { Constants } from '../../helpers/constants/constants';
import { OperationResultMessageDs } from './application/data-structures/operation-result-message.ds';
import { AmplitudeService } from '../amplitude/amplitude.service';

@ApiBearerAuth()
@ApiTags('user')
@UseInterceptors(SentryInterceptor)
@Controller()
@Injectable({ scope: Scope.REQUEST })
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
    private readonly amplitudeService: AmplitudeService,
  ) {}

  @ApiOperation({ summary: 'Get user info' })
  @ApiResponse({ status: 200, description: 'Return current user info' })
  @Get('user')
  async findMe(@Req() request: IRequestWithCognitoInfo): Promise<FoundUserDs> {
    const cognitoUserName = getCognitoUserName(request);
    const gclidValue = findGclidCookieValue(request);
    const findUserDs: FindUserDs = {
      id: cognitoUserName,
      gclidValue: gclidValue,
    };

    return await this.findUserUseCase.execute(findUserDs);
  }

  @ApiOperation({ summary: 'Upgrade subscription' })
  @ApiResponse({ status: 201, description: 'Subscription updated successfully' })
  @ApiBody({ type: UpgradeSubscriptionDto })
  @Post('user/subscription/upgrade')
  async upgradeSubscription(
    @Req() request: IRequestWithCognitoInfo,
    @Body('subscriptionLevel') subscriptionLevel: SubscriptionLevelEnum,
  ): Promise<any> {
    const cognitoUserName = getCognitoUserName(request);
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
      cognitoUserName: cognitoUserName,
    };
    return await this.upgradeUserSubscriptionUseCase.execute(inputData);
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 201, description: 'Login successfull' })
  @ApiBody({ type: LoginUserDto })
  @Post('user/login/')
  async usualLogin(
    @Res({ passthrough: true }) response: Response,
    @Body('email') email: string,
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

    const tokenInfo = await this.usualLoginUseCase.execute(userData);
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, tokenInfo.token);
    return { expires: tokenInfo.exp };
  }

  @ApiOperation({ summary: 'Register with email and password' })
  @ApiResponse({ status: 201, description: 'Registration successfull' })
  @ApiBody({ type: LoginUserDto })
  @Post('user/register/')
  async usualRegister(
    @Req() request,
    @Res({ passthrough: true }) response: Response,
    @Body('email') email: string,
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
    const gclidValue = findGclidCookieValue(request);
    const inputData: UsualLoginDs = {
      email: email,
      password: password,
      gclidValue: gclidValue,
    };
    const tokenInfo = await this.usualRegisterUseCase.execute(inputData);
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, tokenInfo.token);
    return { expires: tokenInfo.exp };
  }

  @ApiOperation({ summary: 'Log out' })
  @ApiResponse({ status: 201, description: 'Log out successfull' })
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
    return await this.logOutUseCase.execute(token);
  }

  @ApiOperation({ summary: 'Register/Login with google' })
  @ApiResponse({ status: 201, description: 'Registration successfull' })
  @ApiBody({ type: SocialNetworkLoginDto })
  @Post('user/google/login/')
  async registerWithGoogle(
    @Req() request,
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
    const glidCookieValue = findGclidCookieValue(request);
    const googleLoginDs: GoogleLoginDs = {
      token: token,
      glidCookieValue: glidCookieValue,
    };
    const tokenInfo = await this.googleLoginUseCase.execute(googleLoginDs);
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, tokenInfo.token);
    return { expires: tokenInfo.exp };
  }

  @ApiOperation({ summary: 'Register with facebook' })
  @ApiResponse({ status: 201, description: 'Registration successfull' })
  @ApiBody({ type: SocialNetworkLoginDto })
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
    const tokenInfo = await this.facebookLoginUseCase.execute(token);
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, tokenInfo.token);
    return { expires: tokenInfo.exp };
  }

  @ApiOperation({ summary: 'Change user usual password' })
  @ApiResponse({ status: 201, description: 'Password changed successfully' })
  @ApiBody({ type: ChangeUsualUserPasswordDto })
  @Post('user/password/change/')
  async changeUsualPassword(
    @Res({ passthrough: true }) response: Response,
    @Body('email') email: string,
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
    const tokenInfo = await this.changeUsualPasswordUseCase.execute(inputData);
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, tokenInfo.token);
    return { expires: tokenInfo.exp };
  }

  @ApiOperation({ summary: 'Request user email confirmation' })
  @ApiResponse({ status: 201, description: 'Email verified' })
  @Get('user/email/verify/request')
  async requestEmailVerification(@Req() request): Promise<OperationResultMessageDs> {
    const cognitoUserName = getCognitoUserName(request);
    return await this.requestEmailVerificationUseCase.execute(cognitoUserName);
  }

  @ApiOperation({ summary: 'Verify user email (requires verification string as slug)' })
  @ApiResponse({ status: 201, description: 'Email verified' })
  @Get('user/email/verify/:slug')
  async verifyEmail(@Param() params): Promise<OperationResultMessageDs> {
    const verificationString: string = params.slug;
    return await this.verifyEmailUseCase.execute(verificationString);
  }

  @ApiOperation({ summary: 'Verify user password reset (requires verification string as slug)' })
  @ApiResponse({ status: 201, description: 'User password reset verified' })
  @ApiBody({ type: PasswordDto })
  @Post('user/password/reset/verify/:slug')
  async resetUserPassword(@Param() params, @Body('password') password: string): Promise<RegisteredUserDs> {
    const verificationString: string = params.slug;
    const inputData: ResetUsualUserPasswordDs = {
      verificationString: verificationString,
      newUserPassword: password,
    };
    return await this.verifyResetUserPasswordUseCase.execute(inputData);
  }

  @ApiOperation({ summary: 'Request a password reset' })
  @ApiResponse({ status: 201, description: 'User password reset requested' })
  @ApiBody({ type: EmailDto })
  @Post('user/password/reset/request/')
  async askResetUserPassword(@Body('email') email: string): Promise<OperationResultMessageDs> {
    return await this.requestResetUserPasswordUseCase.execute(email);
  }

  @ApiOperation({ summary: 'Request an email change' })
  @ApiResponse({ status: 201, description: 'User email change requested' })
  @Get('user/email/change/request/')
  async askChangeUserEmail(@Req() request): Promise<OperationResultMessageDs> {
    const userId = getCognitoUserName(request);
    return await this.requestChangeUserEmailUseCase.execute(userId);
  }

  @ApiOperation({ summary: 'Change user email (requires verification string as slug)' })
  @ApiResponse({ status: 201, description: 'User email changed' })
  @ApiBody({ type: EmailDto })
  @Post('user/email/change/verify/:slug')
  async verifyChangeUserEmail(
    @Req() request,
    @Body('email') email: string,
    @Param() params,
  ): Promise<OperationResultMessageDs> {
    const inputData: ChangeUserEmailDs = {
      newEmail: email,
      verificationString: params.slug,
    };
    if (!email || !isEmail(email)) {
      throw new HttpException(
        {
          message: Messages.EMAIL_INVALID,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.verifyChangeUserEmailUseCase.execute(inputData);
  }

  @ApiOperation({ summary: 'Delete user account' })
  @ApiResponse({ status: 200, description: 'Return delete user account result' })
  @Put('user/delete/')
  async deleteUser(
    @Req() request: IRequestWithCognitoInfo,
    @Body('reason') reason: string,
    @Body('message') message: string,
  ): Promise<Omit<RegisteredUserDs, 'token'>> {
    const cognitoUserName = getCognitoUserName(request);
    const deleteResult = await this.deleteUserAccountUseCase.execute(cognitoUserName);
    await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.userAccountDelete, cognitoUserName, {
      reason: reason,
      message: message,
      user_email: deleteResult.email,
    });
    return deleteResult;
  }
}
