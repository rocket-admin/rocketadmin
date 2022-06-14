import { AgentEntity } from './agent.entity';
import { AuthMiddleware } from '../../authorization';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([AgentEntity])],
  providers: [],
  exports: [],
})
export class AgentModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer.apply(AuthMiddleware).forRoutes();
  }
}
