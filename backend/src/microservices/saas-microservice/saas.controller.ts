import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Param,
  Post,
  Put,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { CompanyInfoEntity } from '../../entities/company-info/company-info.entity.js';
import { SaasUsualUserRegisterDS } from '../../entities/user/application/data-structures/usual-register-user.ds.js';
import { FoundUserDto } from '../../entities/user/dto/found-user.dto.js';
import { ExternalRegistrationProviderEnum } from '../../entities/user/enums/external-registration-provider.enum.js';
import { UserEntity } from '../../entities/user/user.entity.js';
import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { SuccessResponse } from './data-structures/common-responce.ds.js';
import { RegisterCompanyWebhookDS } from './data-structures/register-company.ds.js';
import { RegisteredCompanyDS } from './data-structures/registered-company.ds.js';
import { SaasRegisterUserWithGithub } from './data-structures/saas-register-user-with-github.js';
import { SaasSAMLUserRegisterDS } from './data-structures/saas-saml-user-register.ds.js';
import { SaasRegisterUserWithGoogleDS } from './data-structures/sass-register-user-with-google.js';
import {
  ICompanyRegistration,
  IFreezeConnectionsInCompany,
  IGetUserInfo,
  ILoginUserWithGitHub,
  ILoginUserWithGoogle,
  ISaasDemoRegisterUser,
  ISaaSGetCompanyInfoByUserId,
  ISaaSGetUsersCountInCompany,
  ISaasGetUsersInfosByEmail,
  ISaasRegisterUser,
  ISaasSAMLRegisterUser,
  ISuspendUsers,
  ISuspendUsersOverLimit,
} from './use-cases/saas-use-cases.interface.js';
import { SkipThrottle } from '@nestjs/throttler';
import { Messages } from '../../exceptions/text/messages.js';

@UseInterceptors(SentryInterceptor)
@SkipThrottle()
@Controller('saas')
@ApiBearerAuth()
@ApiTags('saas')
@Injectable()
export class SaasController {
  constructor(
    @Inject(UseCaseType.SAAS_COMPANY_REGISTRATION)
    private readonly companyRegistrationUseCase: ICompanyRegistration,
    @Inject(UseCaseType.SAAS_GET_USER_INFO)
    private readonly getUserInfoUseCase: IGetUserInfo,
    @Inject(UseCaseType.SAAS_SAAS_GET_USERS_INFOS_BY_EMAIL)
    private readonly getUsersInfosByEmailUseCase: ISaasGetUsersInfosByEmail,
    @Inject(UseCaseType.SAAS_USUAL_REGISTER_USER)
    private readonly usualRegisterUserUseCase: ISaasRegisterUser,
    @Inject(UseCaseType.SAAS_DEMO_USER_REGISTRATION)
    private readonly demoRegisterUserUseCase: ISaasDemoRegisterUser,
    @Inject(UseCaseType.SAAS_LOGIN_USER_WITH_GOOGLE)
    private readonly loginUserWithGoogleUseCase: ILoginUserWithGoogle,
    @Inject(UseCaseType.SAAS_LOGIN_USER_WITH_GITHUB)
    private readonly loginUserWithGithubUseCase: ILoginUserWithGitHub,
    @Inject(UseCaseType.SAAS_REGISTER_USER_WITH_SAML)
    private readonly registerUserWithSamlUseCase: ISaasSAMLRegisterUser,
    @Inject(UseCaseType.SAAS_SUSPEND_USERS)
    private readonly suspendUsersUseCase: ISuspendUsers,
    @Inject(UseCaseType.SAAS_SUSPEND_USERS_OVER_LIMIT)
    private readonly suspendUsersOverLimitUseCase: ISuspendUsersOverLimit,
    @Inject(UseCaseType.SAAS_GET_COMPANY_INFO_BY_USER_ID)
    private readonly getCompanyInfoByUserIdUseCase: ISaaSGetCompanyInfoByUserId,
    @Inject(UseCaseType.SAAS_GET_USERS_COUNT_IN_COMPANY)
    private readonly getUsersCountInCompanyByIdUseCase: ISaaSGetUsersCountInCompany,
    @Inject(UseCaseType.FREEZE_CONNECTIONS_IN_COMPANY)
    private readonly freezeConnectionsInCompanyUseCase: IFreezeConnectionsInCompany,
    @Inject(UseCaseType.UNFREEZE_CONNECTIONS_IN_COMPANY)
    private readonly unfreezeConnectionsInCompanyUseCase: IFreezeConnectionsInCompany,
  ) {}

  @ApiOperation({ summary: 'Company registered webhook' })
  @ApiBody({ type: RegisterCompanyWebhookDS })
  @ApiResponse({
    status: 201,
    description: 'The company has been successfully created.',
    type: RegisteredCompanyDS,
  })
  @Post('/company/registered')
  async companyRegistered(
    @Body('userId') registrarUserId: string,
    @Body('companyId') companyId: string,
    @Body('companyName') companyName: string,
  ): Promise<RegisteredCompanyDS> {
    const result = await this.companyRegistrationUseCase.execute({ companyId, registrarUserId, companyName });
    return result;
  }

  @ApiOperation({ summary: 'Get user info by id webhook' })
  @ApiBody({ type: RegisterCompanyWebhookDS })
  @ApiResponse({
    status: 200,
  })
  @Get('/user/:userId')
  async getUserInfo(@Param('userId') userId: string, @Query('companyId') companyId: string): Promise<UserEntity> {
    return await this.getUserInfoUseCase.execute({ userId, companyId });
  }

  @ApiOperation({ summary: 'Get users infos by email webhook' })
  @ApiBody({ type: Array<RegisterCompanyWebhookDS> })
  @ApiResponse({
    status: 200,
  })
  @Get('/users/email/:userEmail')
  async getUsersInfoByEmail(
    @Param('userEmail') userEmail: string,
    @Query('externalProvider') externalProvider: ExternalRegistrationProviderEnum,
  ): Promise<Array<UserEntity>> {
    return await this.getUsersInfosByEmailUseCase.execute({ userEmail, externalProvider });
  }

  @ApiOperation({ summary: 'User register webhook' })
  @ApiBody({ type: SaasUsualUserRegisterDS })
  @ApiResponse({
    status: 201,
    description: 'User has been successfully registered.',
    type: FoundUserDto,
  })
  @Post('user/register')
  async usualUserRegister(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('gclidValue') gclidValue: string,
    @Body('name') name: string,
    @Body('companyId') companyId: string,
    @Body('companyName') companyName: string,
  ): Promise<FoundUserDto> {
    if (!companyId) {
      throw new BadRequestException(Messages.COMPANY_ID_MISSING);
    }
    return await this.usualRegisterUserUseCase.execute({ email, password, gclidValue, name, companyId, companyName });
  }

  @ApiOperation({ summary: 'Register demo user register webhook' })
  @ApiBody({ type: SaasUsualUserRegisterDS })
  @ApiResponse({
    status: 201,
    description: 'Demo user account has been successfully registered.',
    type: FoundUserDto,
  })
  @Post('user/demo/register')
  async registerDemoUserAccount(
    @Body('email') email: string,
    @Body('gclidValue') gclidValue: string,
    @Body('companyId') companyId: string,
    @Body('companyName') companyName: string,
  ): Promise<FoundUserDto> {
    return await this.demoRegisterUserUseCase.execute({ email, gclidValue, companyId, companyName });
  }

  @ApiOperation({ summary: 'Login or create user with google webhook' })
  @ApiBody({ type: SaasRegisterUserWithGoogleDS })
  @ApiResponse({
    status: 201,
  })
  @Post('user/google/login')
  async loginUserWithGoogle(
    @Body('email') email: string,
    @Body('name') name: string,
    @Body('glidCookieValue') glidCookieValue: string,
    @Body('ipAddress') ipAddress: string,
    @Body('userAgent') userAgent: string,
  ): Promise<UserEntity> {
    return await this.loginUserWithGoogleUseCase.execute(
      { email, name, glidCookieValue, ipAddress, userAgent },
      InTransactionEnum.OFF,
    );
  }

  @ApiOperation({ summary: 'Login or create user with github webhook' })
  @ApiBody({ type: SaasRegisterUserWithGithub })
  @ApiResponse({
    status: 201,
  })
  @Post('user/github/login')
  async loginUserWithGithub(
    @Body('email') email: string,
    @Body('name') name: string,
    @Body('githubId') githubId: number,
    @Body('glidCookieValue') glidCookieValue: string,
    @Body('ipAddress') ipAddress: string,
    @Body('userAgent') userAgent: string,
  ): Promise<UserEntity> {
    return await this.loginUserWithGithubUseCase.execute({
      email,
      name,
      githubId,
      glidCookieValue,
      ipAddress,
      userAgent,
    });
  }

  @ApiOperation({ summary: 'Suspending users' })
  @Put('/company/:companyId/users/suspend')
  async suspendUsers(
    @Body('emailsToSuspend') emailsToSuspend: Array<string>,
    @Body('companyId') companyId: string,
  ): Promise<SuccessResponse> {
    await this.suspendUsersUseCase.execute({ emailsToSuspend, companyId });
    return { success: true };
  }

  @ApiOperation({ summary: 'Suspending users' })
  @Put('/company/:companyId/users/suspend-above-limit')
  async suspendUsersOverLimit(@Body('companyId') companyId: string): Promise<SuccessResponse> {
    await this.suspendUsersOverLimitUseCase.execute(companyId);
    return { success: true };
  }

  @ApiOperation({ summary: 'Get company info by user id' })
  @ApiResponse({
    status: 200,
  })
  @Get('/user/:userId/company')
  async getCompanyInfoByUserId(@Param('userId') userId: string): Promise<CompanyInfoEntity> {
    return await this.getCompanyInfoByUserIdUseCase.execute(userId);
  }

  @ApiOperation({ summary: 'Users count in company by company id' })
  @Get('/company/:companyId/users/count')
  async getUsersCountInCompany(@Param('companyId') companyId: string): Promise<{ count: number }> {
    const usersCount = await this.getUsersCountInCompanyByIdUseCase.execute(companyId);
    return { count: usersCount };
  }

  @ApiOperation({ summary: 'Freeze paid connections in companies webhook' })
  @Put('/company/freeze-connections')
  async freezeConnectionsInCompany(@Body('companyIds') companyIds: Array<string>) {
    return await this.freezeConnectionsInCompanyUseCase.execute({ companyIds });
  }

  @ApiOperation({ summary: 'Unfreeze paid connections in companies webhook' })
  @Put('/company/unfreeze-connections')
  async unfreezeConnectionsInCompany(@Body('companyIds') companyIds: Array<string>) {
    return await this.unfreezeConnectionsInCompanyUseCase.execute({ companyIds });
  }

  @ApiOperation({ summary: 'Register user with SAML' })
  @ApiBody({ type: SaasSAMLUserRegisterDS })
  @ApiResponse({
    status: 201,
  })
  @Post('user/saml/login')
  async registerUserWithSaml(
    @Body('email') email: string,
    @Body('name') name: string,
    @Body('companyId') companyId: string,
    @Body('samlConfigId') samlConfigId: string,
    @Body('samlNameId') samlNameId: string,
    @Body('samlAttributes') samlAttributes: Record<string, any>,
  ): Promise<UserEntity> {
    return await this.registerUserWithSamlUseCase.execute({
      email,
      name,
      companyId,
      samlConfigId,
      samlNameId,
      samlAttributes,
    });
  }
}
