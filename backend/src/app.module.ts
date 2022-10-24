import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { GlobalDatabaseContext } from './common/application/global-database-context';
import { BaseType, UseCaseType } from './common/data-injection.tokens';
import { ConnectionPropertiesModule } from './entities/connection-properties/connection-properties.module';
import { ConnectionModule } from './entities/connection/connection.module';
import { ConversionModule } from './entities/convention/conversion.module';
import { CronJobsModule } from './entities/cron-jobs/cron-jobs.module';
import { CustomFieldModule } from './entities/custom-field/custom-field.module';
import { GroupModule } from './entities/group/group.module';
import { PermissionModule } from './entities/permission/permission.module';
import { TableActionModule } from './entities/table-actions/table-action.module';
import { TableLogsModule } from './entities/table-logs/table-logs.module';
import { TableSettingsModule } from './entities/table-settings/table-settings.module';
import { TableModule } from './entities/table/table.module';
import { UserActionModule } from './entities/user-actions/user-action.module';
import { UserModule } from './entities/user/user.module';
import { TableWidgetModule } from './entities/widget/table-widget.module';
import { TimeoutInterceptor } from './interceptors';
import { AppLoggerMiddleware } from './middlewares/logging-middleware/app-logger-middlewate';
import { DatabaseModule } from './shared/database/database.module';
import { GetHelloUseCase } from './use-cases-app/get-hello.use.case';

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
