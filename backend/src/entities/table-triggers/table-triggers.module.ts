import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { TableTriggersController } from './table-triggers.controller.js';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AuthMiddleware } from '../../authorization/auth.middleware.js';
import { FindAllTableTriggersUseCase } from './use-cases/find-all-table-triggers.use.case.js';
import { TableTriggersEntity } from './table-triggers.entity.js';
import { CreateTableTriggersUseCase } from './use-cases/create-table-triggers.use.case.js';
import { UpdateTableTriggersUseCase } from './use-cases/update-table-triggers.use.case.js';
import { DeleteTableTriggersUseCase } from './use-cases/delete-table-triggers.use.case.js';
import { UserEntity } from '../user/user.entity.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([TableTriggersEntity, UserEntity, LogOutEntity])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.FIND_TABLE_TRIGGERS,
      useClass: FindAllTableTriggersUseCase,
    },
    {
      provide: UseCaseType.CREATE_TABLE_TRIGGERS,
      useClass: CreateTableTriggersUseCase,
    },
    {
      provide: UseCaseType.UPDATE_TABLE_TRIGGERS,
      useClass: UpdateTableTriggersUseCase,
    },
    {
      provide: UseCaseType.DELETE_TABLE_TRIGGERS,
      useClass: DeleteTableTriggersUseCase,
    },
  ],
  controllers: [TableTriggersController],
})
export class TableTriggersModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: '/table/triggers/:connectionId', method: RequestMethod.GET },
        { path: '/table/triggers/:connectionId', method: RequestMethod.POST },
        { path: '/table/triggers/:connectionId', method: RequestMethod.PUT },
        { path: '/table/triggers/:connectionId', method: RequestMethod.DELETE },
      );
  }
}
