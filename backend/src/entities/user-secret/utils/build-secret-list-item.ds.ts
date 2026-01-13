import { SecretListItemDS } from '../application/data-structures/get-secrets.ds.js';
import { UserSecretEntity } from '../user-secret.entity.js';

export function buildSecretListItemDS(secret: UserSecretEntity): SecretListItemDS {
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
