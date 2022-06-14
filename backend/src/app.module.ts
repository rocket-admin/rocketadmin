import { AppController } from './app.controller';
import { Connection } from 'typeorm';
import { ConnectionModule } from './entities/connection/connection.module';
import { ConversionModule } from './entities/convention/conversion.module';
import { CustomFieldModule } from './entities/custom-field/custom-field.module';
import { DatabaseModule } from './shared/database/database.module';
import { DatabaseService } from './shared/database/database.service';
import { GroupModule } from './entities/group/group.module';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PermissionModule } from './entities/permission/permission.module';
import { TableLogsModule } from './entities/table-logs/table-logs.module';
import { TableModule } from './entities/table/table.module';
import { TableSettingsModule } from './entities/table-settings/table-settings.module';
import { TableWidgetModule } from './entities/widget/table-widget.module';
import { ScheduleModule } from '@nestjs/schedule';
// import { TracingModule } from '@narando/nest-xray';
import { UserModule } from './entities/user/user.module';
import { ConnectionPropertiesModule } from './entities/connection-properties/connection-properties.module';
import { UserActionModule } from './entities/user-actions/user-action.module';
import { CronJobsModule } from './entities/cron-jobs/cron-jobs.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TimeoutInterceptor } from './interceptors';
import { GlobalDatabaseContext } from './common/application/global-database-context';
import { BaseType, UseCaseType } from './common/data-injection.tokens';
import { GetHelloUseCase } from './use-cases-app/get-hello.use.case';
import { AppLoggerMiddleware } from './middlewares/logging-middleware/app-logger-middlewate';
import { UserAccessModule } from './entities/user-access/user-access.module';

@Module({
  imports: [
    // TracingModule.forRoot({ serviceName: 'autoadmin' }),
    ScheduleModule.forRoot(),
    ConnectionModule,
    ConnectionPropertiesModule,
    ConversionModule,
    CustomFieldModule,
    DatabaseModule,
    GroupModule,
    PermissionModule,
    TableLogsModule,
    TableModule,
    TableSettingsModule,
    TableWidgetModule,
    UserModule,
    UserActionModule,
    CronJobsModule,
    UserAccessModule,
  ],
  controllers: [AppController],
  providers: [
    DatabaseService,
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
  constructor(private readonly connection: Connection) {}
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AppLoggerMiddleware).forRoutes('*');
  }
}
