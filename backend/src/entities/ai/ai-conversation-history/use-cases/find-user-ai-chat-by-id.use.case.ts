import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { FindUserAiChatByIdDs } from '../application/data-structures/user-ai-chat.ds.js';
import { UserAiChatWithMessagesRO } from '../application/response-objects/user-ai-chat.ro.js';
import { buildUserAiChatWithMessagesRO } from '../application/utils/build-user-ai-chat-ro.util.js';
import { IFindUserAiChatById } from './user-ai-chat-use-cases.interface.js';

@Injectable()
export class FindUserAiChatByIdUseCase
	extends AbstractUseCase<FindUserAiChatByIdDs, UserAiChatWithMessagesRO>
	implements IFindUserAiChatById
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: FindUserAiChatByIdDs): Promise<UserAiChatWithMessagesRO> {
		const { userId, chatId } = inputData;
		const foundChat = await this._dbContext.userAiChatRepository.findChatWithMessagesByIdAndUserId(chatId, userId);

		if (!foundChat) {
			throw new NotFoundException(Messages.AI_CHAT_NOT_FOUND);
		}

		return buildUserAiChatWithMessagesRO(foundChat);
	}
}
