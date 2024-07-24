import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization/index.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { TableWidgetController } from './table-widget.controller.js';
import { TableWidgetEntity } from './table-widget.entity.js';
import { CreateUpdateDeleteTableWidgetsUseCase } from './use-cases/create-update-delete-table-widgets.use.case.js';
import { FindTableWidgetsUseCase } from './use-cases/find-table-widgets.use.case.js';

@Module({
  imports: [TypeOrmModule.forFeature([TableWidgetEntity, UserEntity, LogOutEntity])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.FIND_TABLE_WIDGETS,
      useClass: FindTableWidgetsUseCase,
    },
    {
      provide: UseCaseType.CREATE_UPDATE_DELETE_TABLE_WIDGETS,
      useClass: CreateUpdateDeleteTableWidgetsUseCase,
    },
  ],

  controllers: [TableWidgetController],
  exports: [],
})
export class TableWidgetModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: '/widgets/:connectionId', method: RequestMethod.GET },
        { path: '/widget/:connectionId', method: RequestMethod.POST },
      );
  }
}
