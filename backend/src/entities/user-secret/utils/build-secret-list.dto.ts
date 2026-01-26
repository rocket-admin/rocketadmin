import { SecretListResponseDto, SecretListItemDto } from '../application/dto/secret-list.dto.js';
import { SecretsListDS, SecretListItemDS } from '../application/data-structures/get-secrets.ds.js';

export function buildSecretListItemDto(ds: SecretListItemDS): SecretListItemDto {
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

export function buildSecretListResponseDto(ds: SecretsListDS): SecretListResponseDto {
  return {
    data: ds.data.map(buildSecretListItemDto),
    pagination: ds.pagination,
  };
}
