import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization/auth.middleware.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { RequestInfoFromTableWithAIUseCaseV4 } from './use-cases/request-info-from-table-with-ai-v4.use.case.js';
import { UserAIRequestsControllerV2 } from './user-ai-requests-v2.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, LogOutEntity])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.REQUEST_INFO_FROM_TABLE_WITH_AI_V2,
      useClass: RequestInfoFromTableWithAIUseCaseV4,
    },
  ],
  controllers: [UserAIRequestsControllerV2],
})
export class AIModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer.apply(AuthMiddleware).forRoutes({ path: '/ai/v2/request/:connectionId', method: RequestMethod.POST });
  }
}
