import { UserApiKeyEntity } from '../api-key.entity.js';
import { FoundApiKeyDS } from '../application/dto/found-api-key.ds.js';
import { FoundApiKeyDto } from '../application/dto/found-api-key.dto.js';

export function buildFoundApiKeyDto(apiKey: UserApiKeyEntity | FoundApiKeyDS): FoundApiKeyDto {
  return {
    id: apiKey.id,
    title: apiKey.title,
  };
}
