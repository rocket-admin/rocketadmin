import { Global, MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization/auth.middleware.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { AiService } from './ai.service.js';
import { AiChatMessageEntity } from './ai-conversation-history/ai-chat-messages/ai-chat-message.entity.js';
import { DeleteUserAiChatUseCase } from './ai-conversation-history/use-cases/delete-user-ai-chat.use.case.js';
import { FindUserAiChatByIdUseCase } from './ai-conversation-history/use-cases/find-user-ai-chat-by-id.use.case.js';
import { FindUserAiChatsUseCase } from './ai-conversation-history/use-cases/find-user-ai-chats.use.case.js';
import { UserAiChatEntity } from './ai-conversation-history/user-ai-chat/user-ai-chat.entity.js';
import { UserAiChatController } from './ai-conversation-history/user-ai-chat.controller.js';
import { RequestAISettingsAndWidgetsCreationUseCase } from './use-cases/request-ai-settings-and-widgets-creation.use.case.js';
import { RequestInfoFromTableWithAIUseCaseV5 } from './use-cases/request-info-from-table-with-ai-v5.use.case.js';
import { RequestInfoFromTableWithAIUseCaseV6 } from './use-cases/request-info-from-table-with-ai-v6.use.case.js';
import { RequestInfoFromTableWithAIUseCaseV7 } from './use-cases/request-info-from-table-with-ai-v7.use.case.js';
import { UserAIRequestsControllerV2 } from './user-ai-requests-v2.controller.js';

@Global()
@Module({
	imports: [TypeOrmModule.forFeature([UserEntity, LogOutEntity, UserAiChatEntity, AiChatMessageEntity])],
	providers: [
		{
			provide: BaseType.GLOBAL_DB_CONTEXT,
			useClass: GlobalDatabaseContext,
		},
		{
			provide: UseCaseType.REQUEST_INFO_FROM_TABLE_WITH_AI_V2,
			useClass: RequestInfoFromTableWithAIUseCaseV5,
		},
		{
			provide: UseCaseType.REQUEST_INFO_FROM_TABLE_WITH_AI_V3,
			useClass: RequestInfoFromTableWithAIUseCaseV6,
		},
		{
			provide: UseCaseType.REQUEST_INFO_FROM_TABLE_WITH_AI_V4,
			useClass: RequestInfoFromTableWithAIUseCaseV7,
		},
		{
			provide: UseCaseType.REQUEST_AI_SETTINGS_AND_WIDGETS_CREATION,
			useClass: RequestAISettingsAndWidgetsCreationUseCase,
		},
		{
			provide: UseCaseType.FIND_USER_AI_CHATS,
			useClass: FindUserAiChatsUseCase,
		},
		{
			provide: UseCaseType.FIND_USER_AI_CHAT_BY_ID,
			useClass: FindUserAiChatByIdUseCase,
		},
		{
			provide: UseCaseType.DELETE_USER_AI_CHAT,
			useClass: DeleteUserAiChatUseCase,
		},
		AiService,
	],
	exports: [AiService],
	controllers: [UserAIRequestsControllerV2, UserAiChatController],
})
export class AIModule implements NestModule {
	public configure(consumer: MiddlewareConsumer): any {
		consumer
			.apply(AuthMiddleware)
			.forRoutes(
				{ path: '/ai/v2/request/:connectionId', method: RequestMethod.POST },
				{ path: '/ai/v3/request/:connectionId', method: RequestMethod.POST },
				{ path: '/ai/v4/request/:connectionId', method: RequestMethod.POST },
				{ path: '/ai/v2/setup/:connectionId', method: RequestMethod.GET },
				{ path: '/ai/chats', method: RequestMethod.GET },
				{ path: '/ai/chats/:chatId', method: RequestMethod.GET },
				{ path: '/ai/chats/:chatId', method: RequestMethod.DELETE },
			);
	}
}
