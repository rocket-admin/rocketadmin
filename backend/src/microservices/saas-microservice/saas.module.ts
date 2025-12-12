import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaaSAuthMiddleware } from '../../authorization/saas-auth.middleware.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { SaasController } from './saas.controller.js';
import { FreezeConnectionsInCompanyUseCase } from './use-cases/freeze-connections-in-company.use.case.js';
import { GetFullCompanyInfoByUserIdUseCase } from './use-cases/get-full-company-info-by-user-id.use.case.js';
import { GetUserInfoUseCase } from './use-cases/get-user-info.use.case.js';
import { GetUsersCountInCompanyByIdUseCase } from './use-cases/get-users-count-in-company.use.case.js';
import { GetUsersInfosByEmailUseCase } from './use-cases/get-users-infos-by-email.use.case.js';
import { LoginUserWithGithubUseCase } from './use-cases/login-with-github.use.case.js';
import { LoginWithGoogleUseCase } from './use-cases/login-with-google.use.case.js';
import { RegisteredCompanyWebhookUseCase } from './use-cases/register-company-webhook.use.case.js';
import { SaasUsualRegisterUseCase } from './use-cases/saas-usual-register-user.use.case.js';
import { SuspendUsersUseCase } from './use-cases/suspend-users.use.case.js';
import { UnFreezeConnectionsInCompanyUseCase } from './use-cases/unfreeze-connections-in-company-use.case.js';
import { SaasRegisterDemoUserAccountUseCase } from './use-cases/register-demo-user-account.use.case.js';
import { SaaSRegisterUserWIthSamlUseCase } from './use-cases/register-user-with-saml-use.case.js';
import { SuspendUsersOverLimitUseCase } from './use-cases/suspend-users-over-limit.use.case.js';
import { SignInAuditEntity } from '../../entities/user-sign-in-audit/sign-in-audit.entity.js';
import { SignInAuditService } from '../../entities/user-sign-in-audit/sign-in-audit.service.js';
import { UserEntity } from '../../entities/user/user.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([SignInAuditEntity, UserEntity])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.SAAS_COMPANY_REGISTRATION,
      useClass: RegisteredCompanyWebhookUseCase,
    },
    {
      provide: UseCaseType.SAAS_GET_USER_INFO,
      useClass: GetUserInfoUseCase,
    },
    {
      provide: UseCaseType.SAAS_USUAL_REGISTER_USER,
      useClass: SaasUsualRegisterUseCase,
    },
    {
      provide: UseCaseType.SAAS_LOGIN_USER_WITH_GOOGLE,
      useClass: LoginWithGoogleUseCase,
    },
    {
      provide: UseCaseType.SAAS_LOGIN_USER_WITH_GITHUB,
      useClass: LoginUserWithGithubUseCase,
    },
    {
      provide: UseCaseType.SAAS_SAAS_GET_USERS_INFOS_BY_EMAIL,
      useClass: GetUsersInfosByEmailUseCase,
    },
    {
      provide: UseCaseType.SAAS_SUSPEND_USERS,
      useClass: SuspendUsersUseCase,
    },
    {
      provide: UseCaseType.SAAS_GET_COMPANY_INFO_BY_USER_ID,
      useClass: GetFullCompanyInfoByUserIdUseCase,
    },
    {
      provide: UseCaseType.SAAS_GET_USERS_COUNT_IN_COMPANY,
      useClass: GetUsersCountInCompanyByIdUseCase,
    },
    {
      provide: UseCaseType.FREEZE_CONNECTIONS_IN_COMPANY,
      useClass: FreezeConnectionsInCompanyUseCase,
    },
    {
      provide: UseCaseType.UNFREEZE_CONNECTIONS_IN_COMPANY,
      useClass: UnFreezeConnectionsInCompanyUseCase,
    },
    {
      provide: UseCaseType.SAAS_DEMO_USER_REGISTRATION,
      useClass: SaasRegisterDemoUserAccountUseCase,
    },
    {
      provide: UseCaseType.SAAS_REGISTER_USER_WITH_SAML,
      useClass: SaaSRegisterUserWIthSamlUseCase,
    },
    {
      provide: UseCaseType.SAAS_SUSPEND_USERS_OVER_LIMIT,
      useClass: SuspendUsersOverLimitUseCase,
    },
    SignInAuditService,
  ],
  controllers: [SaasController],
  exports: [],
})
export class SaasModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(SaaSAuthMiddleware)
      .forRoutes(
        { path: 'saas/company/registered', method: RequestMethod.POST },
        { path: 'saas/user/:userId', method: RequestMethod.GET },
        { path: 'saas/user/register', method: RequestMethod.POST },
        { path: 'saas/user/demo/register', method: RequestMethod.POST },
        { path: 'saas/user/google/login', method: RequestMethod.POST },
        { path: 'saas/user/github/login', method: RequestMethod.POST },
        { path: 'saas/company/:companyId/users/suspend', method: RequestMethod.PUT },
        { path: 'saas/company/:companyId/users/suspend-above-limit', method: RequestMethod.PUT },
        { path: 'saas/user/:userId/company', method: RequestMethod.GET },
        { path: 'saas/company/:companyId/users/count', method: RequestMethod.GET },
        { path: 'saas/company/freeze-connections', method: RequestMethod.PUT },
        { path: 'saas/company/unfreeze-connections', method: RequestMethod.PUT },
        { path: 'saas/user/saml/login', method: RequestMethod.POST },
      );
  }
}
