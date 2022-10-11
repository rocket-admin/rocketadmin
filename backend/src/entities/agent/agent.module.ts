import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization';
import { GlobalDatabaseContext } from '../../common/application/global-database-context';
import { BaseType } from '../../common/data-injection.tokens';
import { LogOutEntity } from '../log-out/log-out.entity';
import { UserEntity } from '../user/user.entity';
import { AgentEntity } from './agent.entity';

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
