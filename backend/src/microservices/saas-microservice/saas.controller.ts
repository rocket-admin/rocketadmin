import { UseInterceptors, Controller, Injectable, Inject, Post, Body, Get, Param, Put, Query } from '@nestjs/common';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import {
  IAddOrRemoveCompanyIdToUser,
  ICompanyRegistration,
  IGetUserGithubIdInfo,
  IGetUserInfo,
  IGetUserInfoByEmail,
  ILoginUserWithGitHub,
  ILoginUserWithGoogle,
  ISaaSRegisterInvitedUser,
  ISaasGetUsersInfosByEmail,
  ISaasRegisterUser,
  IUpdateUserStripeCustomerId,
} from './use-cases/saas-use-cases.interface.js';
import { RegisteredCompanyDS } from './data-structures/registered-company.ds.js';
import { UserEntity } from '../../entities/user/user.entity.js';
import { FoundUserDs } from '../../entities/user/application/data-structures/found-user.ds.js';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RegisterCompanyWebhookDS } from './data-structures/register-company.ds.js';
import {
  RegisterInvitedUserDS,
  SaasUsualUserRegisterDS,
} from '../../entities/user/application/data-structures/usual-register-user.ds.js';
import { SaasRegisterUserWithGoogleDS } from './data-structures/sass-register-user-with-google.js';
import { SaasRegisterUserWithGithub } from './data-structures/saas-register-user-with-github.js';
import { SuccessResponse } from './data-structures/common-responce.ds.js';
import { UpdateUserStripeCustomerDS } from './data-structures/update-user-stripe-customer-id.ds.js';

@UseInterceptors(SentryInterceptor)
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
    @Inject(UseCaseType.SAAS_GET_USER_INFO_BY_EMAIL)
    private readonly getUserInfoByEmailUseCase: IGetUserInfoByEmail,
    @Inject(UseCaseType.SAAS_SAAS_GET_USERS_INFOS_BY_EMAIL)
    private readonly getUsersInfosByEmailUseCase: ISaasGetUsersInfosByEmail,
    @Inject(UseCaseType.SAAS_USUAL_REGISTER_USER)
    private readonly usualRegisterUserUseCase: ISaasRegisterUser,
    @Inject(UseCaseType.SAAS_LOGIN_USER_WITH_GOOGLE)
    private readonly loginUserWithGoogleUseCase: ILoginUserWithGoogle,
    @Inject(UseCaseType.SAAS_GET_USER_INFO_BY_GITHUBID)
    private readonly getUserInfoUseCaseByGithubId: IGetUserGithubIdInfo,
    @Inject(UseCaseType.SAAS_LOGIN_USER_WITH_GITHUB)
    private readonly loginUserWithGithubUseCase: ILoginUserWithGitHub,
    @Inject(UseCaseType.SAAS_UPDATE_USER_STRIPE_CUSTOMER_ID)
    private readonly updateUserStripeCustomerIdUseCase: IUpdateUserStripeCustomerId,
    @Inject(UseCaseType.SAAS_ADD_COMPANY_ID_TO_USER)
    private readonly addCompanyIdToUserUseCase: IAddOrRemoveCompanyIdToUser,
    @Inject(UseCaseType.SAAS_REMOVE_COMPANY_ID_FROM_USER)
    private readonly removeCompanyIdFromUserUserUseCase: IAddOrRemoveCompanyIdToUser,
    @Inject(UseCaseType.SAAS_REGISTER_INVITED_USER)
    private readonly registerInvitedUserUseCase: ISaaSRegisterInvitedUser,
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
  ): Promise<RegisteredCompanyDS> {
    const result = await this.companyRegistrationUseCase.execute({ companyId, registrarUserId });
    return result;
  }

  @ApiOperation({ summary: 'Get user info by id webhook' })
  @ApiBody({ type: RegisterCompanyWebhookDS })
  @ApiResponse({
    status: 200,
  })
  @Get('/user/:userId')
  async getUserInfo(@Param('userId') userId: string): Promise<UserEntity> {
    return await this.getUserInfoUseCase.execute(userId);
  }

  @ApiOperation({ summary: 'Get user info by github id webhook' })
  @ApiBody({ type: RegisterCompanyWebhookDS })
  @ApiResponse({
    status: 200,
  })
  @Get('/user/github/:githubId')
  async getUserInfoByGitHubId(@Param('githubId') githubId: number): Promise<UserEntity> {
    return await this.getUserInfoUseCaseByGithubId.execute(Number(githubId));
  }

  @ApiOperation({ summary: 'Get user info by email webhook' })
  @ApiBody({ type: RegisterCompanyWebhookDS })
  @ApiResponse({
    status: 200,
  })
  @Get('/user/email/:userEmail')
  async getUserInfoByEmail(
    @Param('userEmail') userEmail: string,
    @Query('companyId') companyId: string,
  ): Promise<UserEntity> {
    const inputData = {
      email: userEmail,
      companyId: companyId ? companyId : null,
    };
    return await this.getUserInfoByEmailUseCase.execute(inputData);
  }

  @ApiOperation({ summary: 'Get users infos by email webhook' })
  @ApiBody({ type: Array<RegisterCompanyWebhookDS> })
  @ApiResponse({
    status: 200,
  })
  @Get('/users/email/:userEmail')
  async getUsersInfoByEmail(@Param('userEmail') userEmail: string): Promise<Array<UserEntity>> {
    return await this.getUsersInfosByEmailUseCase.execute(userEmail);
  }

  @ApiOperation({ summary: 'User register webhook' })
  @ApiBody({ type: SaasUsualUserRegisterDS })
  @ApiResponse({
    status: 201,
    description: 'User has been successfully registered.',
    type: FoundUserDs,
  })
  @Post('user/register')
  async usualUserRegister(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('gclidValue') gclidValue: string,
    @Body('name') name: string,
    @Body('companyId') companyId: string,
  ): Promise<FoundUserDs> {
    companyId = companyId ? companyId : null;
    return await this.usualRegisterUserUseCase.execute({ email, password, gclidValue, name, companyId });
  }

  @ApiOperation({ summary: 'Register invited user in company webhook' })
  @ApiBody({ type: RegisterInvitedUserDS })
  @ApiResponse({
    status: 201,
    description: 'User was successfully invited.',
    type: FoundUserDs,
  })
  @Post('/user/register/invite')
  async registerInvitedUser(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('name') name: string,
    @Body('companyId') companyId: string,
  ): Promise<FoundUserDs> {
    return await this.registerInvitedUserUseCase.execute({ email, password, name, companyId });
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
  ): Promise<UserEntity> {
    return await this.loginUserWithGoogleUseCase.execute({ email, name, glidCookieValue });
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
  ): Promise<UserEntity> {
    return await this.loginUserWithGithubUseCase.execute({ email, name, githubId, glidCookieValue });
  }

  @ApiOperation({ summary: 'Update stripe customer id webhook' })
  @ApiBody({ type: UpdateUserStripeCustomerDS })
  @ApiResponse({
    status: 200,
    type: SuccessResponse,
  })
  @Put('user/:userId/stripe')
  async updateUserStripeCustomerId(
    @Param('userId') userId: string,
    @Body('stripeCustomerId') stripeCustomerId: string,
  ): Promise<SuccessResponse> {
    await this.updateUserStripeCustomerIdUseCase.execute({ userId, stripeCustomerId });
    return { success: true };
  }

  @ApiOperation({ summary: 'Add user in company webhook' })
  @ApiResponse({
    status: 200,
    type: SuccessResponse,
  })
  @Put('/user/:userId/company/:companyId')
  async addCompanyIdToUser(
    @Param('userId') userId: string,
    @Param('companyId') companyId: string,
  ): Promise<SuccessResponse> {
    await this.addCompanyIdToUserUseCase.execute({ userId, companyId });
    return { success: true };
  }

  @ApiOperation({ summary: 'Remove user from company webhook' })
  @ApiResponse({
    status: 200,
    type: SuccessResponse,
  })
  @Put('/user/remove/:userId/company/:companyId')
  async removeCompanyIdFromUser(
    @Param('userId') userId: string,
    @Param('companyId') companyId: string,
  ): Promise<SuccessResponse> {
    await this.removeCompanyIdFromUserUserUseCase.execute({ userId, companyId });
    return { success: true };
  }
}
