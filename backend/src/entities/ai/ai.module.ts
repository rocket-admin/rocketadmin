import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { UserAIRequestsController } from './user-ai-requests.controller.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { RequestInfoFromTableWithAIUseCase } from './use-cases/request-info-from-table-with-ai.use.case.js';
import { AuthMiddleware } from '../../authorization/auth.middleware.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../user/user.entity.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, LogOutEntity])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.REQUEST_INFO_FROM_TABLE_WITH_AI,
      useClass: RequestInfoFromTableWithAIUseCase,
    },
  ],
  controllers: [UserAIRequestsController],
})
export class AIModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer.apply(AuthMiddleware).forRoutes({ path: '/ai/request/:connectionId', method: RequestMethod.POST });
  }
}
