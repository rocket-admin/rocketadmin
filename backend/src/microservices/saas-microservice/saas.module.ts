import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { SaasController } from './saas.controller.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { RegisteredCompanyWebhookUseCase } from './use-cases/register-company-webhook.use.case.js';
import { SaaSAuthMiddleware } from '../../authorization/saas-auth.middleware.js';
import { getUserInfoUseCase } from './use-cases/get-user-info.use.case.js';
import { getUserInfoByEmailUseCase } from './use-cases/get-user-info-by-email.use.case.js';

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
      useClass: getUserInfoUseCase,
    },
    {
      provide: UseCaseType.SAAS_GET_USER_INFO_BY_EMAIL,
      useClass: getUserInfoByEmailUseCase,
    },
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
      );
  }
}
