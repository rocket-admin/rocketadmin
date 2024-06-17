import { UserApiKeyEntity } from '../api-key.entity.js';
import { FoundApiKeyDto } from '../application/dto/found-api-key.dto.js';

export function buildFoundApiKeyDto(apiKey: UserApiKeyEntity): FoundApiKeyDto {
  return {
    id: apiKey.id,
    title: apiKey.title,
  };
}
