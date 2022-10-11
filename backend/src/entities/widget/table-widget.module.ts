import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization';
import { GlobalDatabaseContext } from '../../common/application/global-database-context';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens';
import { LogOutEntity } from '../log-out/log-out.entity';
import { UserEntity } from '../user/user.entity';
import { TableWidgetController } from './table-widget.controller';
import { TableWidgetEntity } from './table-widget.entity';
import { CreateUpdateDeleteTableWidgetsUseCase } from './use-cases/create-update-delete-table-widgets.use.case';
import { FindTableWidgetsUseCase } from './use-cases/find-table-widgets.use.case';

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
        { path: '/widgets/:slug', method: RequestMethod.GET },
        { path: '/widget/:slug', method: RequestMethod.POST },
        { path: '/widget/:slug', method: RequestMethod.DELETE },
      );
  }
}
