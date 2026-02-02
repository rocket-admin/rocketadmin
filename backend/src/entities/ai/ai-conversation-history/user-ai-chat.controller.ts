import { Controller, Delete, Get, Inject, Injectable, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UseCaseType } from '../../../common/data-injection.tokens.js';
import { SlugUuid } from '../../../decorators/slug-uuid.decorator.js';
import { Timeout } from '../../../decorators/timeout.decorator.js';
import { UserId } from '../../../decorators/user-id.decorator.js';
import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { SentryInterceptor } from '../../../interceptors/sentry.interceptor.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import {
	DeleteUserAiChatDs,
	FindUserAiChatByIdDs,
	FindUserAiChatsDs,
} from './application/data-structures/user-ai-chat.ds.js';
import { UserAiChatRO, UserAiChatWithMessagesRO } from './application/response-objects/user-ai-chat.ro.js';
import {
	IDeleteUserAiChat,
	IFindUserAiChatById,
	IFindUserAiChats,
} from './use-cases/user-ai-chat-use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Timeout()
@Controller('ai/chats')
@ApiBearerAuth()
@ApiTags('AI Chats')
@Injectable()
export class UserAiChatController {
	constructor(
		@Inject(UseCaseType.FIND_USER_AI_CHATS)
		private readonly findUserAiChatsUseCase: IFindUserAiChats,
		@Inject(UseCaseType.FIND_USER_AI_CHAT_BY_ID)
		private readonly findUserAiChatByIdUseCase: IFindUserAiChatById,
		@Inject(UseCaseType.DELETE_USER_AI_CHAT)
		private readonly deleteUserAiChatUseCase: IDeleteUserAiChat,
	) {}

	@ApiOperation({ summary: 'Get all AI chats for current user' })
	@ApiResponse({
		status: 200,
		description: 'Returns list of AI chats.',
		type: [UserAiChatRO],
	})
	@Get()
	async findAllChats(@UserId() userId: string): Promise<UserAiChatRO[]> {
		const inputData: FindUserAiChatsDs = { userId };
		return await this.findUserAiChatsUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Get AI chat by ID with all messages' })
	@ApiResponse({
		status: 200,
		description: 'Returns AI chat with messages.',
		type: UserAiChatWithMessagesRO,
	})
	@ApiParam({ name: 'chatId', required: true, type: String })
	@Get(':chatId')
	async findChatById(@UserId() userId: string, @SlugUuid('chatId') chatId: string): Promise<UserAiChatWithMessagesRO> {
		const inputData: FindUserAiChatByIdDs = { userId, chatId };
		return await this.findUserAiChatByIdUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Delete AI chat by ID' })
	@ApiResponse({
		status: 200,
		description: 'AI chat deleted successfully.',
		type: SuccessResponse,
	})
	@ApiParam({ name: 'chatId', required: true, type: String })
	@Delete(':chatId')
	async deleteChat(@UserId() userId: string, @SlugUuid('chatId') chatId: string): Promise<SuccessResponse> {
		const inputData: DeleteUserAiChatDs = { userId, chatId };
		return await this.deleteUserAiChatUseCase.execute(inputData, InTransactionEnum.ON);
	}
}
