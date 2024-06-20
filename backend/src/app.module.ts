import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller.js';
import { GlobalDatabaseContext } from './common/application/global-database-context.js';
import { BaseType, UseCaseType } from './common/data-injection.tokens.js';
import { ConnectionPropertiesModule } from './entities/connection-properties/connection-properties.module.js';
import { ConnectionModule } from './entities/connection/connection.module.js';
import { ConversionModule } from './entities/convention/conversion.module.js';
import { CronJobsModule } from './entities/cron-jobs/cron-jobs.module.js';
import { CustomFieldModule } from './entities/custom-field/custom-field.module.js';
import { GroupModule } from './entities/group/group.module.js';
import { PermissionModule } from './entities/permission/permission.module.js';
import { TableActionModule } from './entities/table-actions/table-actions-module/table-action.module.js';
import { TableLogsModule } from './entities/table-logs/table-logs.module.js';
import { TableSettingsModule } from './entities/table-settings/table-settings.module.js';
import { TableModule } from './entities/table/table.module.js';
import { UserActionModule } from './entities/user-actions/user-action.module.js';
import { UserModule } from './entities/user/user.module.js';
import { TableWidgetModule } from './entities/widget/table-widget.module.js';
import { TimeoutInterceptor } from './interceptors/index.js';
import { AppLoggerMiddleware } from './middlewares/logging-middleware/app-logger-middlewate.js';
import { DatabaseModule } from './shared/database/database.module.js';
import { GetHelloUseCase } from './use-cases-app/get-hello.use.case.js';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import path from 'path';
import { fileURLToPath } from 'url';
import { SaasModule } from './microservices/saas-microservice/saas.module.js';
import { SaaSGatewayModule } from './microservices/gateways/saas-gateway.ts/saas-gateway.module.js';
import { CompanyInfoModule } from './entities/company-info/company-info.module.js';
import { TableTriggersModule } from './entities/table-triggers/action-rules.module.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@Module({
  imports: [
    ScheduleModule.forRoot(),
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
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
    }),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
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
