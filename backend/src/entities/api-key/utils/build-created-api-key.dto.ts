import { UserApiKeyEntity } from '../api-key.entity.js';
import { CreatedApiKeyDS } from '../application/data-structures/created-api-key.ds.js';
import { CreatedApiKeyDto } from '../application/dto/created-api-key.dto.js';

export function buildCreatedApiKeyDto(apiKey: UserApiKeyEntity | CreatedApiKeyDS): CreatedApiKeyDto {
  return {
    id: apiKey.id,
    title: apiKey.title,
    hash: apiKey.hash,
    created_at: apiKey.created_at,
  };
}
