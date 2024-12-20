import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { UserAIRequestsController } from './user-ai-requests.controller.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { RequestInfoFromTableWithAIUseCase } from './use-cases/request-info-from-table-with-ai.use.case.js';
import { AuthMiddleware } from '../../authorization/auth.middleware.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../user/user.entity.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { UserAIThreadsController } from './user-ai-threads.controller.js';
import { CreateThreadWithAIAssistantUseCase } from './use-cases/create-thread-with-ai-assistant.use.case.js';
import { AddMessageToThreadWithAIAssistantUseCase } from './use-cases/add-message-to-thread-with-ai.use.case.js';

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
    {
      provide: UseCaseType.CREATE_THREAD_WITH_AI_ASSISTANT,
      useClass: CreateThreadWithAIAssistantUseCase,
    },
    {
      provide: UseCaseType.ADD_MESSAGE_TO_THREAD_WITH_AI_ASSISTANT,
      useClass: AddMessageToThreadWithAIAssistantUseCase,
    },
  ],
  controllers: [UserAIRequestsController, UserAIThreadsController],
})
export class AIModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: '/ai/request/:connectionId', method: RequestMethod.POST },
        { path: '/ai/thread/:connectionId', method: RequestMethod.POST },
        { path: '/ai/thread/message/:connectionId/:threadId', method: RequestMethod.POST },
      );
  }
}
