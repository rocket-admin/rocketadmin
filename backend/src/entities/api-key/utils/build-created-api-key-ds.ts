import { UserApiKeyEntity } from '../api-key.entity.js';
import { CreatedApiKeyDS } from '../application/data-structures/created-api-key.ds.js';

export function buildCreatedApiKeyDS(apiKey: UserApiKeyEntity): CreatedApiKeyDS {
  return {
    id: apiKey.id,
    title: apiKey.title,
    hash: apiKey.hash,
  };
}
