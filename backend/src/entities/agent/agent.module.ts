import { AgentEntity } from './agent.entity';
import { AuthMiddleware } from '../../authorization';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BaseType } from '../../common/data-injection.tokens';
import { GlobalDatabaseContext } from '../../common/application/global-database-context';

@Module({
  imports: [TypeOrmModule.forFeature([AgentEntity])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
  ],
  exports: [],
})
export class AgentModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer.apply(AuthMiddleware).forRoutes();
  }
}
