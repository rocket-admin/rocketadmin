import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../../authorization/index.js';
import { GlobalDatabaseContext } from '../../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../../common/data-injection.tokens.js';
import { LogOutEntity } from '../../log-out/log-out.entity.js';
import { UserEntity } from '../../user/user.entity.js';
import { TableActionsController } from './table-action.controller.js';
import { TableActionEntity } from './table-action.entity.js';
import { ActivateTableActionsUseCase } from './use-cases/activate-table-actions.use.case.js';
import { CreateTableActionUseCase } from './use-cases/create-table-action.use.case.js';
import { DeleteTableActionUseCase } from './use-cases/delete-table-action.use.case.js';
import { FindTableActionsUseCase } from './use-cases/find-all-table-actions.use.case.js';
import { FindTableActionUseCase } from './use-cases/find-table-action.use.case.js';
import { UpdateTableActionUseCase } from './use-cases/update-table-action.use.case.js';

@Module({
  imports: [TypeOrmModule.forFeature([TableActionEntity, UserEntity, LogOutEntity])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.CREATE_TABLE_ACTION,
      useClass: CreateTableActionUseCase,
    },
    {
      provide: UseCaseType.FIND_TABLE_ACTIONS,
      useClass: FindTableActionsUseCase,
    },
    {
      provide: UseCaseType.ACTIVATE_TABLE_ACTIONS,
      useClass: ActivateTableActionsUseCase,
    },
    {
      provide: UseCaseType.UPDATE_TABLE_ACTION,
      useClass: UpdateTableActionUseCase,
    },
    {
      provide: UseCaseType.DELETE_TABLE_ACTION,
      useClass: DeleteTableActionUseCase,
    },
    {
      provide: UseCaseType.FIND_TABLE_ACTION,
      useClass: FindTableActionUseCase,
    },
  ],
  controllers: [TableActionsController],
})
export class TableActionModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: '/table/actions/:slug', method: RequestMethod.GET },
        { path: '/table/action/:slug', method: RequestMethod.GET },
        { path: '/table/action/:slug', method: RequestMethod.POST },
        { path: '/table/actions/activate/:slug', method: RequestMethod.POST },
        { path: '/table/action/:slug', method: RequestMethod.PUT },
        { path: '/table/action/:slug', method: RequestMethod.DELETE },
      );
  }
}
