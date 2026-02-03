import { InTransactionEnum } from '../../../../enums/in-transaction.enum.js';
import { SuccessResponse } from '../../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import {
	DeleteUserAiChatDs,
	FindUserAiChatByIdDs,
	FindUserAiChatsDs,
} from '../application/data-structures/user-ai-chat.ds.js';
import { UserAiChatRO, UserAiChatWithMessagesRO } from '../application/response-objects/user-ai-chat.ro.js';

export interface IFindUserAiChats {
	execute(inputData: FindUserAiChatsDs, inTransaction: InTransactionEnum): Promise<UserAiChatRO[]>;
}

export interface IFindUserAiChatById {
	execute(inputData: FindUserAiChatByIdDs, inTransaction: InTransactionEnum): Promise<UserAiChatWithMessagesRO>;
}

export interface IDeleteUserAiChat {
	execute(inputData: DeleteUserAiChatDs, inTransaction: InTransactionEnum): Promise<SuccessResponse>;
}
