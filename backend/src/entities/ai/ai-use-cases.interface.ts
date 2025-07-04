import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { SuccessResponse } from '../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { AddMessageToThreadWithAssistantDS } from './application/data-structures/add-message-to-thread-with-assistant.ds.js';
import { CreateThreadWithAssistantDS } from './application/data-structures/create-thread-with-assistant.ds.js';
import { DeleteThreadWithAssistantDS } from './application/data-structures/delete-thread-with-assistant.ds.js';
import { FindAllThreadMessagesDS } from './application/data-structures/find-all-thread-messages.ds.js';
import {
  RequestInfoFromTableDS,
  RequestInfoFromTableDSV2,
} from './application/data-structures/request-info-from-table.ds.js';
import { ResponseInfoDS } from './application/data-structures/response-info.ds.js';
import { FoundUserThreadMessagesRO } from './application/dto/found-user-thread-messages.ro.js';
import { FoundUserThreadsWithAiRO } from './application/dto/found-user-threads-with-ai.ro.js';

export interface IRequestInfoFromTable {
  execute(inputData: RequestInfoFromTableDS, inTransaction: InTransactionEnum): Promise<ResponseInfoDS>;
}

export interface IRequestInfoFromTableV2 {
  execute(inputData: RequestInfoFromTableDSV2, inTransaction: InTransactionEnum): Promise<void>;
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

export interface IGetAllThreadMessages {
  execute(
    inputData: FindAllThreadMessagesDS,
    inTransaction: InTransactionEnum,
  ): Promise<Array<FoundUserThreadMessagesRO>>;
}

export interface IDeleteThreadWithAIAssistant {
  execute(inputData: DeleteThreadWithAssistantDS, inTransaction: InTransactionEnum): Promise<SuccessResponse>;
}
