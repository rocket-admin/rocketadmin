import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { SaasController } from './saas.controller.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { RegisteredCompanyWebhookUseCase } from './use-cases/register-company-webhook.use.case.js';
import { SaaSAuthMiddleware } from '../../authorization/saas-auth.middleware.js';
import { GetUserInfoUseCase } from './use-cases/get-user-info.use.case.js';
import { GetUserInfoByEmailUseCase } from './use-cases/get-user-info-by-email.use.case.js';
import { SaasUsualRegisterUseCase } from './use-cases/saas-usual-register-user.use.case.js';
import { LoginWithGoogleUseCase } from './use-cases/login-with-google.use.case.js';
import { GetUserInfoByGitHubIdUseCase } from './use-cases/get-user-info-by-githubid.use.case.js';
import { LoginUserWithGithubUseCase } from './use-cases/login-with-github.use.case.js';
import { UpdateUserStripeCustomerIdUseCase } from './use-cases/update-user-stripe-customer-id.use.case.js';
import { AddCompanyIdToUserUseCase } from './use-cases/add-company-id-to-user-use.case.js';
import { RemoveCompanyIdFromUserUseCase } from './use-cases/remove-company-id-from-user.use.case.js';

@Module({
  imports: [],
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
      provide: UseCaseType.SAAS_GET_USER_INFO_BY_EMAIL,
      useClass: GetUserInfoByEmailUseCase,
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
      provide: UseCaseType.SAAS_GET_USER_INFO_BY_GITHUBID,
      useClass: GetUserInfoByGitHubIdUseCase,
    },
    {
      provide: UseCaseType.SAAS_LOGIN_USER_WITH_GITHUB,
      useClass: LoginUserWithGithubUseCase,
    },
    {
      provide: UseCaseType.SAAS_UPDATE_USER_STRIPE_CUSTOMER_ID,
      useClass: UpdateUserStripeCustomerIdUseCase,
    },
    {
      provide: UseCaseType.SAAS_ADD_COMPANY_ID_TO_USER,
      useClass: AddCompanyIdToUserUseCase,
    },
    {
      provide: UseCaseType.SAAS_REMOVE_COMPANY_ID_FROM_USER,
      useClass: RemoveCompanyIdFromUserUseCase,
    }
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
        { path: 'saas/user/email/:userEmail', method: RequestMethod.GET },
        { path: 'saas/user/register', method: RequestMethod.POST },
        { path: 'saas/user/google/login', method: RequestMethod.POST },
        { path: 'saas/user/github/:githubId', method: RequestMethod.GET },
        { path: 'saas/user/github/login', method: RequestMethod.POST },
        { path: 'saas/user/:userId/stripe', method: RequestMethod.PUT },
        { path: 'saas/user/:userId/company/:companyId', method: RequestMethod.PUT },
      );
  }
}
