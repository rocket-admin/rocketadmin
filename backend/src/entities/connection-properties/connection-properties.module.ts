import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConnectionPropertiesController } from './connection-properties.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConnectionEntity } from '../connection/connection.entity';
import { ConnectionPropertiesEntity } from './connection-properties.entity';
import { AuthMiddleware } from '../../authorization';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens';
import { FindConnectionPropertiesUseCase } from './use-cases/find-connection-properties-use.case';
import { GlobalDatabaseContext } from '../../common/application/global-database-context';
import { CreateConnectionPropertiesUseCase } from './use-cases/create-connection-properties.use.case';
import { UpdateConnectionPropertiesUseCase } from './use-cases/update-connection-properties.use.case';
import { DeleteConnectionPropertiesUseCase } from './use-cases/delete-connection-properties.use.case';

@Module({
  imports: [TypeOrmModule.forFeature([ConnectionEntity, ConnectionPropertiesEntity])],
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
    consumer.apply(AuthMiddleware).forRoutes({ path: '/connection/properties/:slug', method: RequestMethod.GET });
    consumer.apply(AuthMiddleware).forRoutes({ path: '/connection/properties/:slug', method: RequestMethod.POST });
    consumer.apply(AuthMiddleware).forRoutes({ path: '/connection/properties/:slug', method: RequestMethod.PUT });
    consumer.apply(AuthMiddleware).forRoutes({ path: '/connection/properties/:slug', method: RequestMethod.DELETE });
  }
}
