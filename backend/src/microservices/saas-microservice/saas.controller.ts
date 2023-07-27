import { UseInterceptors, Controller, Injectable, Inject, Post, Body, Get, Param } from '@nestjs/common';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { ICompanyRegistration, IGetUserInfo } from './use-cases/saas-use-cases.interface.js';
import { RegisteredCompanyDS } from './data-structures/registered-company.ds.js';
import { UserEntity } from '../../entities/user/user.entity.js';

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

  @Get('/user/email/:userEmail')
  async getUserInfoByEmail(@Param('userEmail') userEmail: string): Promise<UserEntity> {
    return await this.getUserInfoByEmailUseCase.execute(userEmail);
  }
}
