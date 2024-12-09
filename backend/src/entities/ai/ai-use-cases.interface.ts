import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { CreateThreadWithAssistantDS } from './application/data-structures/create-thread-with-assistant.ds.js';
import { CreatedThreadWithAssistantDS } from './application/data-structures/created-thread-with-assistant.ds.js';
import { RequestInfoFromTableDS } from './application/data-structures/request-info-from-table.ds.js';
import { ResponseInfoDS } from './application/data-structures/response-info.ds.js';

export interface IRequestInfoFromTable {
  execute(inputData: RequestInfoFromTableDS, inTransaction: InTransactionEnum): Promise<ResponseInfoDS>;
}

export interface ICreateThreadWithAIAssistant {
  execute(
    inputData: CreateThreadWithAssistantDS,
    inTransaction: InTransactionEnum,
  ): Promise<CreatedThreadWithAssistantDS>;
}
