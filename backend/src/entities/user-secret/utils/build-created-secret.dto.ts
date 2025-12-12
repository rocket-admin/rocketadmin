import { FoundSecretDto } from '../application/dto/found-secret.dto.js';
import { CreatedSecretDS } from '../application/data-structures/created-secret.ds.js';

export function buildCreatedSecretDto(ds: CreatedSecretDS): FoundSecretDto {
  return {
    id: ds.id,
    slug: ds.slug,
    companyId: ds.companyId,
    createdAt: ds.createdAt,
    updatedAt: ds.updatedAt,
    lastAccessedAt: ds.lastAccessedAt,
    expiresAt: ds.expiresAt,
    masterEncryption: ds.masterEncryption,
  };
}
