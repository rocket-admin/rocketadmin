import { Global, MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization';
import { GlobalDatabaseContext } from '../../common/application/global-database-context';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens';
import { LogOutEntity } from '../log-out/log-out.entity';
import { TableSettingsEntity } from '../table-settings/table-settings.entity';
import { UserEntity } from '../user/user.entity';
import { TableLogsController } from './table-logs.controller';
import { TableLogsEntity } from './table-logs.entity';
import { TableLogsService } from './table-logs.service';
import { FindLogsUseCase } from './use-cases/find-logs.use.case';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([TableLogsEntity, UserEntity, LogOutEntity, TableSettingsEntity])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.FIND_LOGS,
      useClass: FindLogsUseCase,
    },
    TableLogsService,
  ],
  controllers: [TableLogsController],
  exports: [TableLogsService],
})
export class TableLogsModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: '/logs/:slug', method: RequestMethod.GET }, { path: '/logs/', method: RequestMethod.DELETE });
  }
}
