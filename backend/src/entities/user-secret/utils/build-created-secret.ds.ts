import { CreatedSecretDS } from '../application/data-structures/created-secret.ds.js';
import { UserSecretEntity } from '../user-secret.entity.js';

export function buildCreatedSecretDS(secret: UserSecretEntity): CreatedSecretDS {
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
