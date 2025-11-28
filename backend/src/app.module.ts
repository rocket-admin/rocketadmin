import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller.js';
import { GlobalDatabaseContext } from './common/application/global-database-context.js';
import { BaseType, UseCaseType } from './common/data-injection.tokens.js';
import { AIModule } from './entities/ai/ai.module.js';
import { ApiKeyModule } from './entities/api-key/api-key.module.js';
import { CompanyFaviconModule } from './entities/company-favicon/company-favicon.module.js';
import { CompanyInfoModule } from './entities/company-info/company-info.module.js';
import { CompanyLogoModule } from './entities/company-logo/company-logo.module.js';
import { CompanyTabTitleModule } from './entities/company-tab-title/company-tab-title.module.js';
import { ConnectionPropertiesModule } from './entities/connection-properties/connection-properties.module.js';
import { ConnectionModule } from './entities/connection/connection.module.js';
import { ConversionModule } from './entities/convention/conversion.module.js';
import { CronJobsModule } from './entities/cron-jobs/cron-jobs.module.js';
import { CustomFieldModule } from './entities/custom-field/custom-field.module.js';
import { DemoDataModule } from './entities/demo-data/demo-deta.module.js';
import { EmailModule } from './entities/email/email/email.module.js';
import { GroupModule } from './entities/group/group.module.js';
import { LoggingModule } from './entities/logging/logging.module.js';
import { PermissionModule } from './entities/permission/permission.module.js';
import { TableTriggersModule } from './entities/table-actions/table-action-rules-module/action-rules.module.js';
import { TableActionModule } from './entities/table-actions/table-actions-module/table-action.module.js';
import { TableFiltersModule } from './entities/table-filters/table-filters.module.js';
import { TableLogsModule } from './entities/table-logs/table-logs.module.js';
import { TableSettingsModule } from './entities/table-settings/table-settings.module.js';
import { TableModule } from './entities/table/table.module.js';
import { UserActionModule } from './entities/user-actions/user-action.module.js';
import { UserModule } from './entities/user/user.module.js';
import { TableWidgetModule } from './entities/widget/table-widget.module.js';
import { TimeoutInterceptor } from './interceptors/index.js';
import { SaaSGatewayModule } from './microservices/gateways/saas-gateway.ts/saas-gateway.module.js';
import { SaasModule } from './microservices/saas-microservice/saas.module.js';
import { AppLoggerMiddleware } from './middlewares/logging-middleware/app-logger-middlewate.js';
import { DatabaseModule } from './shared/database/database.module.js';
import { GetHelloUseCase } from './use-cases-app/get-hello.use.case.js';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { SharedJobsModule } from './entities/shared-jobs/shared-jobs.module.js';
import { TableCategoriesModule } from './entities/table-categories/table-categories.module.js';
import { SignInAuditModule } from './entities/user-sign-in-audit/sign-in-audit.module.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 200,
        },
      ],
    }),
    ConnectionModule,
    ConnectionPropertiesModule,
    ConversionModule,
    CustomFieldModule,
    GroupModule,
    PermissionModule,
    TableLogsModule,
    TableModule,
    TableSettingsModule,
    TableWidgetModule,
    UserModule,
    UserActionModule,
    CronJobsModule,
    DatabaseModule,
    TableActionModule,
    SaasModule,
    CompanyInfoModule,
    SaaSGatewayModule,
    TableTriggersModule,
    ApiKeyModule,
    AIModule,
    EmailModule,
    CompanyLogoModule,
    CompanyFaviconModule,
    CompanyTabTitleModule,
    TableFiltersModule,
    DemoDataModule,
    LoggingModule,
    SharedJobsModule,
    TableCategoriesModule,
    SignInAuditModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.GET_HELLO,
      useClass: GetHelloUseCase,
    },
  ],
})
export class ApplicationModule implements NestModule {
  constructor(private dataSource: DataSource) {}
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AppLoggerMiddleware).forRoutes('*');
  }
}
