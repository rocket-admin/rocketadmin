import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { AddMessageToThreadWithAssistantDS } from './application/data-structures/add-message-to-thread-with-assistant.ds.js';
import { CreateThreadWithAssistantDS } from './application/data-structures/create-thread-with-assistant.ds.js';
import { RequestInfoFromTableDS } from './application/data-structures/request-info-from-table.ds.js';
import { ResponseInfoDS } from './application/data-structures/response-info.ds.js';
import { FoundUserThreadsWithAiRO } from './application/dto/found-user-threads-with-ai.ro.js';

export interface IRequestInfoFromTable {
  execute(inputData: RequestInfoFromTableDS, inTransaction: InTransactionEnum): Promise<ResponseInfoDS>;
}

export interface ICreateThreadWithAIAssistant {
  execute(inputData: CreateThreadWithAssistantDS, inTransaction: InTransactionEnum): Promise<void>;
}

export interface IAddMessageToThreadWithAIAssistant {
  execute(inputData: AddMessageToThreadWithAssistantDS, inTransaction: InTransactionEnum): Promise<void>;
}

export interface IGetAllUserThreadsWithAIAssistant {
  execute(userId: string, inTransaction: InTransactionEnum): Promise<Array<FoundUserThreadsWithAiRO>>;
}
