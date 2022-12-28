import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization';
import { GlobalDatabaseContext } from '../../common/application/global-database-context';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens';
import { LogOutEntity } from '../log-out/log-out.entity';
import { UserEntity } from '../user/user.entity';
import { TableActionsController } from './table-action.controller';
import { TableActionEntity } from './table-action.entity';
import { ActivateTableActionUseCase } from './use-cases/activate-table-action.use.case';
import { ActivateTableActionsUseCase } from './use-cases/activate-table-actions.use.case';
import { CreateTableActionUseCase } from './use-cases/create-table-action.use.case';
import { DeleteTableActionUseCase } from './use-cases/delete-table-action.use.case';
import { FindTableActionsUseCase } from './use-cases/find-all-table-actions.use.case';
import { FindTableActionUseCase } from './use-cases/find-table-action.use.case';
import { UpdateTableActionUseCase } from './use-cases/update-table-action.use.case';

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
      provide: UseCaseType.ACTIVATE_TABLE_ACTION,
      useClass: ActivateTableActionUseCase,
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
        { path: '/table/action/activate/:slug', method: RequestMethod.POST },
        { path: '/table/actions/activate/:slug', method: RequestMethod.POST },
        { path: '/table/action/:slug', method: RequestMethod.PUT },
        { path: '/table/action/:slug', method: RequestMethod.DELETE },
      );
  }
}
