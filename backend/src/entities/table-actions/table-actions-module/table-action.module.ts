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

@Module({
  imports: [TypeOrmModule.forFeature([TableActionEntity, UserEntity, LogOutEntity])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.ACTIVATE_TABLE_ACTIONS,
      useClass: ActivateTableActionsUseCase,
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
        { path: '/table/actions/activate/:slug', method: RequestMethod.POST },
      );
  }
}
