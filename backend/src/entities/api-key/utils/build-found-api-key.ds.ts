import { UserApiKeyEntity } from '../api-key.entity.js';
import { FoundApiKeyDS } from '../application/dto/found-api-key.ds.js';

export function buildFoundApiKeyDS(apiKey: UserApiKeyEntity): FoundApiKeyDS {
  return {
    id: apiKey.id,
    title: apiKey.title,
    created_at: apiKey.created_at,
  };
}
