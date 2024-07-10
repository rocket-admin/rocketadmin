import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization/index.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { ConnectionPropertiesController } from './connection-properties.controller.js';
import { ConnectionPropertiesEntity } from './connection-properties.entity.js';
import { CreateConnectionPropertiesUseCase } from './use-cases/create-connection-properties.use.case.js';
import { DeleteConnectionPropertiesUseCase } from './use-cases/delete-connection-properties.use.case.js';
import { FindConnectionPropertiesUseCase } from './use-cases/find-connection-properties-use.case.js';
import { UpdateConnectionPropertiesUseCase } from './use-cases/update-connection-properties.use.case.js';

@Module({
  imports: [TypeOrmModule.forFeature([ConnectionEntity, ConnectionPropertiesEntity, UserEntity, LogOutEntity])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.FIND_CONNECTION_PROPERTIES,
      useClass: FindConnectionPropertiesUseCase,
    },
    {
      provide: UseCaseType.CREATE_CONNECTION_PROPERTIES,
      useClass: CreateConnectionPropertiesUseCase,
    },
    {
      provide: UseCaseType.UPDATE_CONNECTION_PROPERTIES,
      useClass: UpdateConnectionPropertiesUseCase,
    },
    {
      provide: UseCaseType.DELETE_CONNECTION_PROPERTIES,
      useClass: DeleteConnectionPropertiesUseCase,
    },
  ],
  controllers: [ConnectionPropertiesController],
  exports: [],
})
export class ConnectionPropertiesModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthMiddleware).forRoutes({ path: '/connection/properties/:connectionId', method: RequestMethod.GET });
    consumer.apply(AuthMiddleware).forRoutes({ path: '/connection/properties/:connectionId', method: RequestMethod.POST });
    consumer.apply(AuthMiddleware).forRoutes({ path: '/connection/properties/:connectionId', method: RequestMethod.PUT });
    consumer.apply(AuthMiddleware).forRoutes({ path: '/connection/properties/:connectionId', method: RequestMethod.DELETE });
  }
}
