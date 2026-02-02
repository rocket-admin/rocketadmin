import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { FindUserAiChatsDs } from '../application/data-structures/user-ai-chat.ds.js';
import { UserAiChatRO } from '../application/response-objects/user-ai-chat.ro.js';
import { buildUserAiChatRO } from '../application/utils/build-user-ai-chat-ro.util.js';
import { IFindUserAiChats } from './user-ai-chat-use-cases.interface.js';

@Injectable()
export class FindUserAiChatsUseCase
	extends AbstractUseCase<FindUserAiChatsDs, UserAiChatRO[]>
	implements IFindUserAiChats
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: FindUserAiChatsDs): Promise<UserAiChatRO[]> {
		const { userId } = inputData;
		const foundChats = await this._dbContext.userAiChatRepository.findAllChatsForUser(userId);
		return foundChats.map((chat) => buildUserAiChatRO(chat));
	}
}
