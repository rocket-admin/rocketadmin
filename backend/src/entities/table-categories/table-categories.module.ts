import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AuthMiddleware } from '../../authorization/auth.middleware.js';
import { TableCategoriesController } from './table-categories.controller.js';
import { FindTableCategoriesUseCase } from './use-cases/find-table-categories.use.case.js';
import { CreateOrUpdateTableCategoriesUseCase } from './use-cases/create-or-update-table-categories.use.case.js';
import { UserEntity } from '../user/user.entity.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, LogOutEntity])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.FIND_TABLE_CATEGORIES,
      useClass: FindTableCategoriesUseCase,
    },
    {
      provide: UseCaseType.CREATE_UPDATE_TABLE_CATEGORIES,
      useClass: CreateOrUpdateTableCategoriesUseCase,
    },
  ],
  controllers: [TableCategoriesController],
})
export class TableCategoriesModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: '/table-categories/:connectionId/', method: RequestMethod.GET },
        { path: '/table-categories/:connectionId/', method: RequestMethod.PUT },
      );
  }
}
