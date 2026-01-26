import { FoundSecretDto } from '../application/dto/found-secret.dto.js';
import { UpdatedSecretDS } from '../application/data-structures/update-secret.ds.js';

export function buildUpdatedSecretDto(ds: UpdatedSecretDS): FoundSecretDto {
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
