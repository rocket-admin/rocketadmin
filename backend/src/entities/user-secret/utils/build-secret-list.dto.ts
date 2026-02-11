import { SecretListItemDS, SecretsListDS } from '../application/data-structures/get-secrets.ds.js';
import { SecretListItemDto, SecretListResponseDto } from '../application/dto/secret-list.dto.js';

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
