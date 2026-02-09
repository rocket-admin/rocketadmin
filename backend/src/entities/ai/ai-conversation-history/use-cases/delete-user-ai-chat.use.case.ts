import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { SuccessResponse } from '../../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { DeleteUserAiChatDs } from '../application/data-structures/user-ai-chat.ds.js';
import { IDeleteUserAiChat } from './user-ai-chat-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class DeleteUserAiChatUseCase
	extends AbstractUseCase<DeleteUserAiChatDs, SuccessResponse>
	implements IDeleteUserAiChat
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: DeleteUserAiChatDs): Promise<SuccessResponse> {
		const { userId, chatId } = inputData;
		const foundChat = await this._dbContext.userAiChatRepository.findChatByIdAndUserId(chatId, userId);

		if (!foundChat) {
			throw new NotFoundException(Messages.AI_CHAT_NOT_FOUND);
		}

		await this._dbContext.aiChatMessageRepository.deleteMessagesForChat(chatId);
		await this._dbContext.userAiChatRepository.remove(foundChat);

		return { success: true };
	}
}
