// Port of frontend/src/app/services/secrets.service.ts: the company's secrets vault and its audit log.
//
// Angular pushed 'created' | 'updated' | 'deleted' through `secrets.cast` and SecretsComponent then
// reloaded its page of secrets. Here the store keeps that page (`secrets`, `pagination`, the query it
// was loaded with) and each mutation reloads it.
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api, isApiError, type RequestOptions } from '@/api/client';
import type {
	AuditLogResponse,
	CreateSecretPayload,
	DeleteSecretResponse,
	Secret,
	SecretListResponse,
	SecretPagination,
	UpdateSecretPayload,
} from '@/models/secret';
import { useNotificationsStore } from '@/stores/notifications';

export interface SecretsQuery {
	page: number;
	limit: number;
	search?: string;
}

export const useSecretsStore = defineStore('secrets', () => {
	const secrets = ref<Secret[]>([]);
	const pagination = ref<SecretPagination | null>(null);
	const loading = ref(false);
	/** The query of the page on screen; null until a list has been loaded. */
	const lastQuery = ref<SecretsQuery | null>(null);

	async function fetchSecrets(page = 1, limit = 20, search?: string): Promise<SecretListResponse> {
		lastQuery.value = { page, limit, search };
		loading.value = true;
		try {
			const response = await withFallbackMessage(
				() =>
					api.get<SecretListResponse>('/secrets', {
						params: { page, limit, search: search || undefined },
						notify: false,
					}),
				'Failed to fetch secrets',
			);
			secrets.value = response.data;
			pagination.value = response.pagination;
			return response;
		} finally {
			loading.value = false;
		}
	}

	async function createSecret(payload: CreateSecretPayload): Promise<Secret> {
		const secret = await withFallbackMessage(
			() => api.post<Secret>('/secrets', payload, { notify: false, successMessage: 'Secret created successfully' }),
			'Failed to create secret',
			{ 409: 'A secret with this slug already exists' },
		);
		reloadSecrets();
		return secret;
	}

	/**
	 * A 403 (wrong or missing master password) is rethrown without a notification so the caller can
	 * ask for the master password and retry.
	 */
	async function updateSecret(slug: string, payload: UpdateSecretPayload, masterPassword?: string): Promise<Secret> {
		const options: RequestOptions = { notify: false, successMessage: 'Secret updated successfully' };
		if (masterPassword) options.headers = { masterpwd: masterPassword };
		const secret = await withFallbackMessage(
			() => api.put<Secret>(`/secrets/${slug}`, payload, options),
			'Failed to update secret',
			{ 403: null, 410: 'Cannot update an expired secret' },
		);
		reloadSecrets();
		return secret;
	}

	async function deleteSecret(slug: string): Promise<DeleteSecretResponse> {
		const response = await withFallbackMessage(
			() =>
				api.delete<DeleteSecretResponse>(`/secrets/${slug}`, {
					notify: false,
					successMessage: 'Secret deleted successfully',
				}),
			'Failed to delete secret',
		);
		reloadSecrets();
		return response;
	}

	function getAuditLog(slug: string, page = 1, limit = 50): Promise<AuditLogResponse> {
		return withFallbackMessage(
			() => api.get<AuditLogResponse>(`/secrets/${slug}/audit-log`, { params: { page, limit }, notify: false }),
			'Failed to fetch audit log',
		);
	}

	/** Reloads the page on screen, if one was loaded. Failures were already shown. */
	async function reloadSecrets(): Promise<void> {
		const query = lastQuery.value;
		if (!query) return;
		try {
			await fetchSecrets(query.page, query.limit, query.search);
		} catch {
			// reported in fetchSecrets
		}
	}

	return {
		secrets,
		pagination,
		loading,
		lastQuery,
		fetchSecrets,
		reloadSecrets,
		createSecret,
		updateSecret,
		deleteSecret,
		getAuditLog,
	};
});

/**
 * The secrets endpoints show the server's message or a per-call fallback (the client's own
 * `errorMessage` would override the server's). `byStatus` maps a status to its own message, or to
 * null to rethrow without notifying.
 */
async function withFallbackMessage<T>(
	request: () => Promise<T>,
	fallback: string,
	byStatus: Record<number, string | null> = {},
): Promise<T> {
	try {
		return await request();
	} catch (error) {
		// Non-API errors (aborts) and 401s (already redirecting to /login) pass straight through.
		if (!isApiError(error) || error.notified) throw error;
		const special = byStatus[error.status];
		if (special === null) throw error;
		useNotificationsStore().showErrorSnackbar(special ?? (error.body.message || fallback));
		error.notified = true;
		throw error;
	}
}
