import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization/index.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType } from '../../common/data-injection.tokens.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { AgentEntity } from './agent.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([AgentEntity, UserEntity, LogOutEntity])],
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
