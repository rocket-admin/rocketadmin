import { FoundSecretDS } from '../application/data-structures/found-secret.ds.js';
import { UserSecretEntity } from '../user-secret.entity.js';

export function buildFoundSecretDS(secret: UserSecretEntity): FoundSecretDS {
  return {
    id: secret.id,
    slug: secret.slug,
    companyId: secret.companyId,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt,
    lastAccessedAt: secret.lastAccessedAt,
    expiresAt: secret.expiresAt,
    masterEncryption: secret.masterEncryption,
  };
}
