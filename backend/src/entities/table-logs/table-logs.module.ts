import { AuthMiddleware } from '../../authorization';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TableLogsController } from './table-logs.controller';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens';
import { GlobalDatabaseContext } from '../../common/application/global-database-context';
import { FindLogsUseCase } from './use-cases/find-logs.use.case';

@Module({
  imports: [],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.FIND_LOGS,
      useClass: FindLogsUseCase,
    },
  ],
  controllers: [TableLogsController],
  exports: [],
})
export class TableLogsModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: '/logs/:slug', method: RequestMethod.GET }, { path: '/logs/', method: RequestMethod.DELETE });
  }
}
