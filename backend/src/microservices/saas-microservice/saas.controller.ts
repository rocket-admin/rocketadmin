import { UseInterceptors, Controller, Injectable, Inject, Post, Body, Get, Param } from '@nestjs/common';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import {
  ICompanyRegistration,
  IGetUserGithubIdInfo,
  IGetUserInfo,
  ILoginUserWithGitHub,
  ILoginUserWithGoogle,
  ISaasRegisterUser,
} from './use-cases/saas-use-cases.interface.js';
import { RegisteredCompanyDS } from './data-structures/registered-company.ds.js';
import { UserEntity } from '../../entities/user/user.entity.js';
import { FoundUserDs } from '../../entities/user/application/data-structures/found-user.ds.js';

@UseInterceptors(SentryInterceptor)
@Controller('saas')
@Injectable()
export class SaasController {
  constructor(
    @Inject(UseCaseType.SAAS_COMPANY_REGISTRATION)
    private readonly companyRegistrationUseCase: ICompanyRegistration,
    @Inject(UseCaseType.SAAS_GET_USER_INFO)
    private readonly getUserInfoUseCase: IGetUserInfo,
    @Inject(UseCaseType.SAAS_GET_USER_INFO_BY_EMAIL)
    private readonly getUserInfoByEmailUseCase: IGetUserInfo,
    @Inject(UseCaseType.SAAS_USUAL_REGISTER_USER)
    private readonly usualRegisterUserUseCase: ISaasRegisterUser,
    @Inject(UseCaseType.SAAS_LOGIN_USER_WITH_GOOGLE)
    private readonly loginUserWithGoogleUseCase: ILoginUserWithGoogle,
    @Inject(UseCaseType.SAAS_GET_USER_INFO_BY_GITHUBID)
    private readonly getUserInfoUseCaseByGithubId: IGetUserGithubIdInfo,
    @Inject(UseCaseType.SAAS_LOGIN_USER_WITH_GITHUB)
    private readonly loginUserWithGithubUseCase: ILoginUserWithGitHub,
  ) {}

  @Post('/company/registered')
  async companyRegistered(
    @Body('userId') registrarUserId: string,
    @Body('companyId') companyId: string,
  ): Promise<RegisteredCompanyDS> {
    const result = await this.companyRegistrationUseCase.execute({ companyId, registrarUserId });
    return result;
  }

  @Get('/user/:userId')
  async getUserInfo(@Param('userId') userId: string): Promise<UserEntity> {
    return await this.getUserInfoUseCase.execute(userId);
  }

  @Get('/user/github/:githubId')
  async getUserInfoByGitHubId(@Param('githubId') githubId: number): Promise<UserEntity> {
    return await this.getUserInfoUseCaseByGithubId.execute(Number(githubId));
  }

  @Get('/user/email/:userEmail')
  async getUserInfoByEmail(@Param('userEmail') userEmail: string): Promise<UserEntity> {
    return await this.getUserInfoByEmailUseCase.execute(userEmail);
  }

  @Post('user/register')
  async usualUserRegister(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('gclidValue') gclidValue: string,
    @Body('name') name: string,
  ): Promise<FoundUserDs> {
    return await this.usualRegisterUserUseCase.execute({ email, password, gclidValue, name });
  }

  @Post('user/google/login')
  async loginUserWithGoogle(
    @Body('email') email: string,
    @Body('name') name: string,
    @Body('glidCookieValue') glidCookieValue: string,
  ): Promise<UserEntity> {
    return await this.loginUserWithGoogleUseCase.execute({ email, name, glidCookieValue });
  }

  @Post('user/github/login')
  async loginUserWithGithub(
    @Body('email') email: string,
    @Body('name') name: string,
    @Body('githubId') githubId: number,
    @Body('glidCookieValue') glidCookieValue: string,
  ): Promise<UserEntity> {
    return await this.loginUserWithGithubUseCase.execute({ email, name, githubId, glidCookieValue });
  }
}
