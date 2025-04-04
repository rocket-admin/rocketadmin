import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { Response, Request } from 'express';
import isEmail from 'validator/lib/isEmail.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { BodyEmail, GCLlId, UserId, VerificationString } from '../../decorators/index.js';
import { InTransactionEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { slackPostMessage } from '../../helpers/index.js';
import { Constants } from '../../helpers/constants/constants.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { ChangeUserEmailDs } from './application/data-structures/change-user-email.ds.js';
import { ChangeUserNameDS } from './application/data-structures/change-user-name.ds.js';
import {
  ChangeUsualUserPasswordDs,
  ChangeUsualUserPasswordDto,
} from './application/data-structures/change-usual-user-password.ds.js';
import { FindUserDs } from './application/data-structures/find-user.ds.js';
import { FoundUserDto } from './dto/found-user.dto.js';
import { OperationResultMessageDs } from './application/data-structures/operation-result-message.ds.js';
import { RegisteredUserDs } from './application/data-structures/registered-user.ds.js';
import { ResetUsualUserPasswordDs } from './application/data-structures/reset-usual-user-password.ds.js';
import { UsualLoginDs } from './application/data-structures/usual-login.ds.js';
import {
  IChangeUserName,
  IDeleteUserAccount,
  IDisableOTP,
  IFindUserUseCase,
  IGenerateOTP,
  IGetUserSettings,
  ILogOut,
  IOtpLogin,
  IRequestEmailChange,
  IRequestEmailVerification,
  IRequestPasswordReset,
  ISaveUserSettings,
  IToggleTestConnectionsMode,
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
import { getCookieDomainOptions } from './utils/get-cookie-domain-options.js';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PasswordDto } from './dto/password.dto.js';
import { EmailDto } from './dto/email.dto.js';
import { DeleteUserAccountDTO } from './dto/delete-user-account-request.dto.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { UserNameDto } from './dto/user-name.dto.js';
import { OtpTokenDto } from './dto/otp-token.dto.js';
import { UserSettingsDataRequestDto } from './dto/user-settings-data-request.dto.js';
import { RequestRestUserPasswordDto } from './dto/request-rest-user-password.dto.js';
import { SuccessResponse } from '../../microservices/saas-microservice/data-structures/common-responce.ds.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('User')
@Injectable()
export class UserController {
  constructor(
    @Inject(UseCaseType.FIND_USER)
    private readonly findUserUseCase: IFindUserUseCase,
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
    @Inject(UseCaseType.SAVE_USER_SESSION_SETTINGS)
    private readonly saveUserSessionSettingsUseCase: ISaveUserSettings,
    @Inject(UseCaseType.GET_USER_SESSION_SETTINGS)
    private readonly getUserSessionSettingsUseCase: IGetUserSettings,
    @Inject(UseCaseType.TOGGLE_TEST_CONNECTIONS_DISPLAY_MODE)
    private readonly toggleTestConnectionsDisplayModeUseCase: IToggleTestConnectionsMode,
  ) {}

  @ApiOperation({ summary: 'Find user' })
  @ApiResponse({
    status: 200,
    description: 'User found.',
    type: FoundUserDto,
  })
  @Get('user')
  async findMe(@UserId() userId: string, @GCLlId() glidCookieValue: string): Promise<FoundUserDto> {
    const findUserDs: FindUserDs = {
      id: userId,
      gclidValue: glidCookieValue,
    };

    return await this.findUserUseCase.execute(findUserDs, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({
    status: 201,
    description: 'Login successful.',
    type: TokenExpDs,
  })
  @Post('user/login/')
  async usualLogin(
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
    @Body() loginUserData: LoginUserDto,
  ): Promise<ITokenExp> {
    const { email, password, companyId: userCompanyId } = loginUserData;
    const userData: UsualLoginDs = {
      email: email,
      password: password,
      gclidValue: null,
      companyId: userCompanyId,
      request_domain: request.hostname,
    };

    const tokenInfo = await this.usualLoginUseCase.execute(userData, InTransactionEnum.OFF);

    response.cookie(Constants.JWT_COOKIE_KEY_NAME, tokenInfo.token, {
      httpOnly: true,
      secure: true,
      expires: tokenInfo.exp,
      ...getCookieDomainOptions(request.hostname),
    });
    response.cookie(Constants.ROCKETADMIN_AUTHENTICATED_COOKIE, tokenInfo.exp.getTime(), {
      httpOnly: false,
      expires: tokenInfo.exp,
      ...getCookieDomainOptions(request.hostname),
    });
    return { expires: tokenInfo.exp, isTemporary: tokenInfo.isTemporary };
  }

  @ApiOperation({ summary: 'Log out' })
  @ApiResponse({
    status: 201,
    description: 'Logged out.',
  })
  @Post('user/logout/')
  async logOut(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<any> {
    const token = request.cookies[Constants.JWT_COOKIE_KEY_NAME];
    if (!token) {
      throw new HttpException(
        {
          message: Messages.TOKEN_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, '', {
      expires: new Date(0),
      ...getCookieDomainOptions(request.hostname),
    });
    response.cookie(Constants.ROCKETADMIN_AUTHENTICATED_COOKIE, 1, {
      expires: new Date(0),
      httpOnly: false,
      ...getCookieDomainOptions(request.hostname),
    });
    return await this.logOutUseCase.execute(token, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Change user password' })
  @ApiBody({ type: ChangeUsualUserPasswordDto })
  @ApiResponse({
    status: 201,
    description: 'Password changed.',
    type: TokenExpDs,
  })
  @Post('user/password/change/')
  async changeUsualPassword(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() changePasswordData: ChangeUsualUserPasswordDto,
    @UserId() userId: string,
  ): Promise<ITokenExp> {
    const { email, newPassword, oldPassword } = changePasswordData;
    const inputData: ChangeUsualUserPasswordDs = {
      email: email,
      newPassword: newPassword,
      oldPassword: oldPassword,
      userId: userId,
    };
    const tokenInfo = await this.changeUsualPasswordUseCase.execute(inputData, InTransactionEnum.ON);
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, tokenInfo.token, {
      httpOnly: true,
      secure: true,
      expires: tokenInfo.exp,
      ...getCookieDomainOptions(request.hostname),
    });
    response.cookie(Constants.ROCKETADMIN_AUTHENTICATED_COOKIE, tokenInfo.exp.getTime(), {
      httpOnly: false,
      expires: tokenInfo.exp,
      ...getCookieDomainOptions(request.hostname),
    });
    return { expires: tokenInfo.exp, isTemporary: tokenInfo.isTemporary };
  }

  @ApiOperation({ summary: 'Request user email verification' })
  @ApiResponse({
    status: 200,
    description: 'Email verification requested.',
    type: OperationResultMessageDs,
  })
  @Get('user/email/verify/request')
  async requestEmailVerification(@UserId() userId: string): Promise<OperationResultMessageDs> {
    return await this.requestEmailVerificationUseCase.execute(userId, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Verify user email' })
  @ApiResponse({
    status: 200,
    description: 'Email verified.',
    type: OperationResultMessageDs,
  })
  @Get('user/email/verify/:verificationString')
  async verifyEmail(
    @VerificationString('verificationString') verificationString: string,
  ): Promise<OperationResultMessageDs> {
    return await this.verifyEmailUseCase.execute(verificationString, InTransactionEnum.ON);
  }

  //todo: make admin endpoint
  @ApiOperation({ summary: 'Verify user password reset' })
  @ApiBody({ type: PasswordDto })
  @ApiResponse({
    status: 201,
    description: 'Password reset verified.',
    type: RegisteredUserDs,
  })
  @Post('user/password/reset/verify/:verificationString')
  async resetUserPassword(
    @Body() passwordData: PasswordDto,
    @VerificationString('verificationString') verificationString: string,
  ): Promise<RegisteredUserDs> {
    const inputData: ResetUsualUserPasswordDs = {
      verificationString: verificationString,
      newUserPassword: passwordData.password,
    };
    return await this.verifyResetUserPasswordUseCase.execute(inputData, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Request user password reset' })
  @ApiBody({ type: RequestRestUserPasswordDto })
  @ApiResponse({
    status: 201,
    description: 'Password reset requested.',
    type: OperationResultMessageDs,
  })
  @Post('user/password/reset/request/')
  async askResetUserPassword(@Body() emailData: RequestRestUserPasswordDto): Promise<OperationResultMessageDs> {
    return await this.requestResetUserPasswordUseCase.execute(emailData, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Request user email change' })
  @ApiResponse({
    status: 200,
    description: 'Email change requested.',
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
    description: 'Email change verified.',
    type: OperationResultMessageDs,
  })
  @Post('user/email/change/verify/:verificationString')
  async verifyChangeUserEmail(
    @BodyEmail('email') email: string,
    @VerificationString('verificationString') verificationString: string,
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
    return await this.verifyChangeUserEmailUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Change user name' })
  @ApiBody({ type: UserNameDto })
  @ApiResponse({
    status: 200,
    description: 'User name changed.',
    type: FoundUserDto,
  })
  @Put('user/name/')
  async changeUserName(@UserId() userId: string, @Body() nameData: UserNameDto): Promise<FoundUserDto> {
    const inputData: ChangeUserNameDS = {
      id: userId,
      name: nameData.name,
    };
    return await this.changeUserNameUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Delete user account' })
  @ApiBody({ type: DeleteUserAccountDTO })
  @ApiResponse({
    status: 200,
    description: 'Account deleted.',
    type: RegisteredUserDs,
  })
  @Put('user/delete/')
  async deleteUser(
    @Req() request: Request,
    @UserId() userId: string,
    @Body() deletingAccountReasonData: DeleteUserAccountDTO,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Omit<RegisteredUserDs, 'token'>> {
    const deleteResult = await this.deleteUserAccountUseCase.execute(userId, InTransactionEnum.ON);
    const { reason, message } = deletingAccountReasonData;
    const slackMessage = Messages.USER_DELETED_ACCOUNT(deleteResult.email, reason, message);

    response.cookie(Constants.JWT_COOKIE_KEY_NAME, '', {
      ...getCookieDomainOptions(request.hostname),
      expires: new Date(0),
    });
    response.cookie(Constants.ROCKETADMIN_AUTHENTICATED_COOKIE, 1, {
      expires: new Date(0),
      httpOnly: false,
      ...getCookieDomainOptions(request.hostname),
    });

    await slackPostMessage(slackMessage);
    return deleteResult;
  }

  @ApiOperation({ summary: 'Generate one time token and QR Code' })
  @ApiResponse({
    status: 201,
    description: 'Token and QR generated.',
    type: OtpSecretDS,
  })
  @Post('user/otp/generate/')
  async generateOtp(@UserId() userId: string): Promise<OtpSecretDS> {
    return await this.generateOtpUseCase.execute(userId, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Verify one time token' })
  @ApiBody({ type: OtpTokenDto })
  @ApiResponse({
    status: 201,
    description: 'Token verified.',
    type: OtpValidationResultDS,
  })
  @Post('user/otp/verify/')
  async verifyOtp(@UserId() userId: string, @Body() otpTokenData: OtpTokenDto): Promise<OtpValidationResultDS> {
    const { otpToken } = otpTokenData;
    return await this.verifyOtpUseCase.execute({ userId, otpToken }, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Disable user two-factor authentication' })
  @ApiBody({ type: OtpTokenDto })
  @ApiResponse({
    status: 201,
    description: 'Two-factor authentication disabled.',
    type: OtpDisablingResultDS,
  })
  @Post('user/otp/disable/')
  async disableOtp(@UserId() userId: string, @Body() otpTokenData: OtpTokenDto): Promise<OtpDisablingResultDS> {
    const { otpToken } = otpTokenData;
    return await this.disableOtpUseCase.execute({ userId, otpToken }, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Validate two-factor authentication token for login with second factor' })
  @ApiBody({ type: OtpTokenDto })
  @ApiResponse({
    status: 201,
    description: 'Two-factor authentication token validated.',
    type: TokenExpDs,
  })
  @Post('user/otp/login/')
  async validateOtp(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @UserId() userId: string,
    @Body() otpTokenData: OtpTokenDto,
  ): Promise<any> {
    const { otpToken } = otpTokenData;
    const tokenInfo = await this.otpLoginUseCase.execute({ userId, otpToken }, InTransactionEnum.OFF);
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, tokenInfo.token, {
      httpOnly: true,
      secure: true,
      expires: tokenInfo.exp,
      ...getCookieDomainOptions(request.hostname),
    });
    response.cookie(Constants.ROCKETADMIN_AUTHENTICATED_COOKIE, tokenInfo.exp.getTime(), {
      httpOnly: false,
      expires: tokenInfo.exp,
      ...getCookieDomainOptions(request.hostname),
    });
    return {
      expires: tokenInfo.exp,
      isTemporary: tokenInfo.isTemporary,
    };
  }

  @ApiOperation({ summary: 'Save user session settings' })
  @ApiBody({ type: UserSettingsDataRequestDto })
  @ApiResponse({
    status: 201,
    description: 'User session settings saved.',
    type: UserSettingsDataRequestDto,
  })
  @Post('user/settings/')
  async saveUserSessionSettings(
    @Body() userSettings: UserSettingsDataRequestDto,
    @UserId() userId: string,
  ): Promise<UserSettingsDataRequestDto> {
    return await this.saveUserSessionSettingsUseCase.execute(
      { userId, userSettings: userSettings.userSettings },
      InTransactionEnum.OFF,
    );
  }

  @ApiOperation({ summary: 'Find user session settings' })
  @ApiResponse({
    status: 201,
    description: 'User session settings found.',
    type: UserSettingsDataRequestDto,
  })
  @Get('user/settings/')
  async getUserSessionSettings(@UserId() userId: string): Promise<UserSettingsDataRequestDto> {
    return await this.getUserSessionSettingsUseCase.execute(userId, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Toggle display mode of test connections' })
  @ApiResponse({
    status: 200,
    description: 'Display mode of test connections changed.',
    type: SuccessResponse,
  })
  @ApiQuery({ name: 'displayMode', required: true, type: 'string', enum: ['on', 'off'] })
  @Put('user/test/connections/display/')
  async toggleTestConnectionsDisplayMode(
    @UserId() userId: string,
    @Query('displayMode') displayMode: string,
  ): Promise<SuccessResponse> {
    if (displayMode !== 'on' && displayMode !== 'off') {
      throw new BadRequestException(Messages.INVALID_DISPLAY_MODE);
    }
    const newDisplayMode = displayMode === 'on';
    const toggleConnectionDisplayModeDs = {
      userId: userId,
      displayMode: newDisplayMode,
    };
    return await this.toggleTestConnectionsDisplayModeUseCase.execute(
      toggleConnectionDisplayModeDs,
      InTransactionEnum.OFF,
    );
  }
}
