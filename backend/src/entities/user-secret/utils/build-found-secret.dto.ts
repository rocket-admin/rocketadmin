import { FoundSecretDto } from '../application/dto/found-secret.dto.js';
import { FoundSecretDS } from '../application/data-structures/found-secret.ds.js';

export function buildFoundSecretDto(ds: FoundSecretDS): FoundSecretDto {
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
