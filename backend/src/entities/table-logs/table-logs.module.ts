import { Global, MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization/index.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { TableSettingsEntity } from '../table-settings/table-settings.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { TableLogsController } from './table-logs.controller.js';
import { TableLogsEntity } from './table-logs.entity.js';
import { TableLogsService } from './table-logs.service.js';
import { FindLogsUseCase } from './use-cases/find-logs.use.case.js';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity.js';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      TableLogsEntity,
      UserEntity,
      LogOutEntity,
      TableSettingsEntity,
      ConnectionPropertiesEntity,
    ]),
  ],
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
