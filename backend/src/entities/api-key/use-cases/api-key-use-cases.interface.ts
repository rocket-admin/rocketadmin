import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { CreateApiKeyDS } from '../application/data-structures/create-api-key.ds.js';
import { CreatedApiKeyDS } from '../application/data-structures/created-api-key.ds.js';
import { FindApiKeyDS } from '../application/data-structures/find-api-key.ds.js';
import { FoundApiKeyDS } from '../application/dto/found-api-key.ds.js';

export interface ICreateApiKey {
  execute(inputData: CreateApiKeyDS, inTransaction: InTransactionEnum): Promise<CreatedApiKeyDS>;
}

export interface IGetApiKeys {
  execute(userId: string): Promise<Array<FoundApiKeyDS>>;
}

export interface IGetApiKey {
  execute(apiKeyData: FindApiKeyDS): Promise<FoundApiKeyDS>;
}

export interface IDeleteApiKey {
  execute(apiKeyData: FindApiKeyDS, inTransaction: InTransactionEnum): Promise<FoundApiKeyDS>;
}
