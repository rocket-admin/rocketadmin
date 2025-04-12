import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization/auth.middleware.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { TableFiltersController } from './table-filters.controller.js';
import { TableFiltersEntity } from './table-filters.entity.js';
import { CreateTableFiltersUseCase } from './use-cases/create-table-filters.use.case.js';
import { UserEntity } from '../user/user.entity.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([TableFiltersEntity, UserEntity, LogOutEntity])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.CREATE_TABLE_FILTERS,
      useClass: CreateTableFiltersUseCase,
    },
  ],
  controllers: [TableFiltersController],
})
export class TableFiltersModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: '/table-filters/:connectionId', method: RequestMethod.POST },
        { path: '/table-filters/:connectionId', method: RequestMethod.GET },
        { path: '/table-filters/:connectionId', method: RequestMethod.DELETE },
      );
  }
}
