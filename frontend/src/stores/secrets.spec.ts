import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '@/api/client';
import type { Secret, SecretListResponse } from '@/models/secret';
import { useNotificationsStore } from '@/stores/notifications';
import { useSecretsStore } from './secrets';

vi.mock('@/api/client', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/api/client')>();
	return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

const get = vi.mocked(api.get);
const post = vi.mocked(api.post);
const put = vi.mocked(api.put);
const del = vi.mocked(api.delete);

const secret: Secret = {
	id: 's1',
	slug: 'db-password',
	companyId: 'company-1',
	createdAt: '2024-01-01T00:00:00Z',
	updatedAt: '2024-01-01T00:00:00Z',
	masterEncryption: false,
};

const list: SecretListResponse = {
	data: [secret],
	pagination: { total: 1, currentPage: 1, perPage: 20, lastPage: 1 },
};

function apiError(status: number, message?: string): ApiError {
	return new ApiError(message ?? `HTTP ${status}`, status, message ? { message } : {});
}

function lastSnackbar(): string | undefined {
	return useNotificationsStore().snackbars.at(-1)?.message;
}

describe('secrets store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		get.mockResolvedValue(list);
	});

	describe('fetchSecrets', () => {
		it('loads a page with the default pagination', async () => {
			const store = useSecretsStore();

			await expect(store.fetchSecrets()).resolves.toEqual(list);

			expect(get).toHaveBeenCalledWith('/secrets', {
				params: { page: 1, limit: 20, search: undefined },
				notify: false,
			});
			expect(store.secrets).toEqual([secret]);
			expect(store.pagination).toEqual(list.pagination);
			expect(store.loading).toBe(false);
		});

		it('passes custom pagination and the search query', async () => {
			await useSecretsStore().fetchSecrets(2, 10, 'db');
			expect(get).toHaveBeenCalledWith('/secrets', { params: { page: 2, limit: 10, search: 'db' }, notify: false });
		});

		it('shows the server message on failure', async () => {
			get.mockRejectedValueOnce(apiError(500, 'Database down'));
			const store = useSecretsStore();

			await expect(store.fetchSecrets()).rejects.toMatchObject({ notified: true });
			expect(lastSnackbar()).toBe('Database down');
			expect(store.loading).toBe(false);
		});

		it('falls back to a default message', async () => {
			get.mockRejectedValueOnce(apiError(500));
			await expect(useSecretsStore().fetchSecrets()).rejects.toThrow();
			expect(lastSnackbar()).toBe('Failed to fetch secrets');
		});
	});

	describe('createSecret', () => {
		it('creates a secret and reloads the page on screen', async () => {
			post.mockResolvedValueOnce(secret);
			const store = useSecretsStore();
			await store.fetchSecrets(3, 10, 'db');
			get.mockClear();

			const payload = { slug: 'db-password', value: 'hunter2', masterEncryption: true, masterPassword: 'mp' };
			await expect(store.createSecret(payload)).resolves.toEqual(secret);
			await flushPromises();

			expect(post).toHaveBeenCalledWith('/secrets', payload, {
				notify: false,
				successMessage: 'Secret created successfully',
			});
			expect(get).toHaveBeenCalledWith('/secrets', { params: { page: 3, limit: 10, search: 'db' }, notify: false });
		});

		it('does not reload when no page was loaded', async () => {
			post.mockResolvedValueOnce(secret);
			await useSecretsStore().createSecret({ slug: 'x', value: 'y' });
			await flushPromises();
			expect(get).not.toHaveBeenCalled();
		});

		it('explains a slug conflict', async () => {
			post.mockRejectedValueOnce(apiError(409, 'Conflict'));
			await expect(useSecretsStore().createSecret({ slug: 'x', value: 'y' })).rejects.toThrow();
			expect(lastSnackbar()).toBe('A secret with this slug already exists');
		});

		it('shows the generic message on other failures', async () => {
			post.mockRejectedValueOnce(apiError(500));
			await expect(useSecretsStore().createSecret({ slug: 'x', value: 'y' })).rejects.toThrow();
			expect(lastSnackbar()).toBe('Failed to create secret');
		});
	});

	describe('updateSecret', () => {
		it('updates a secret, clearing the expiration with null', async () => {
			put.mockResolvedValueOnce(secret);
			await useSecretsStore().updateSecret('db-password', { value: 'new', expiresAt: null });

			expect(put).toHaveBeenCalledWith(
				'/secrets/db-password',
				{ value: 'new', expiresAt: null },
				{ notify: false, successMessage: 'Secret updated successfully' },
			);
		});

		it('sends the master password as a header only when given', async () => {
			put.mockResolvedValue(secret);
			const store = useSecretsStore();

			await store.updateSecret('db-password', { value: 'new' }, 'master');
			await store.updateSecret('db-password', { value: 'new' });

			expect(put.mock.calls[0]?.[2]).toMatchObject({ headers: { masterpwd: 'master' } });
			expect(put.mock.calls[1]?.[2]).not.toHaveProperty('headers');
		});

		it('rethrows a 403 without a notification, so the caller can ask for the master password', async () => {
			put.mockRejectedValueOnce(apiError(403, 'Invalid master password'));

			await expect(useSecretsStore().updateSecret('db-password', { value: 'new' })).rejects.toMatchObject({
				status: 403,
				notified: false,
			});
			expect(useNotificationsStore().snackbars).toEqual([]);
		});

		it('explains an expired secret', async () => {
			put.mockRejectedValueOnce(apiError(410, 'Gone'));
			await expect(useSecretsStore().updateSecret('db-password', { value: 'new' })).rejects.toThrow();
			expect(lastSnackbar()).toBe('Cannot update an expired secret');
		});

		it('shows the server message on other failures', async () => {
			put.mockRejectedValueOnce(apiError(500, 'Server error'));
			await expect(useSecretsStore().updateSecret('db-password', { value: 'new' })).rejects.toThrow();
			expect(lastSnackbar()).toBe('Server error');
		});
	});

	describe('deleteSecret', () => {
		it('deletes a secret and reloads the page on screen', async () => {
			del.mockResolvedValueOnce({ message: 'deleted', deletedAt: '2024-01-02' });
			const store = useSecretsStore();
			await store.fetchSecrets();
			get.mockClear();

			await store.deleteSecret('db-password');
			await flushPromises();

			expect(del).toHaveBeenCalledWith('/secrets/db-password', {
				notify: false,
				successMessage: 'Secret deleted successfully',
			});
			expect(get).toHaveBeenCalledOnce();
		});

		it('falls back to a default message', async () => {
			del.mockRejectedValueOnce(apiError(500));
			await expect(useSecretsStore().deleteSecret('db-password')).rejects.toThrow();
			expect(lastSnackbar()).toBe('Failed to delete secret');
		});
	});

	describe('getAuditLog', () => {
		it('fetches the audit log with default and custom pagination', async () => {
			const store = useSecretsStore();
			await store.getAuditLog('db-password');
			await store.getAuditLog('db-password', 2, 10);

			expect(get).toHaveBeenCalledWith('/secrets/db-password/audit-log', {
				params: { page: 1, limit: 50 },
				notify: false,
			});
			expect(get).toHaveBeenCalledWith('/secrets/db-password/audit-log', {
				params: { page: 2, limit: 10 },
				notify: false,
			});
		});

		it('falls back to a default message', async () => {
			get.mockRejectedValueOnce(apiError(500));
			await expect(useSecretsStore().getAuditLog('db-password')).rejects.toThrow();
			expect(lastSnackbar()).toBe('Failed to fetch audit log');
		});
	});

	it('leaves a 401 to the client, which is already redirecting', async () => {
		const unauthorized = apiError(401);
		unauthorized.notified = true;
		get.mockRejectedValueOnce(unauthorized);

		await expect(useSecretsStore().fetchSecrets()).rejects.toBe(unauthorized);
		expect(useNotificationsStore().snackbars).toEqual([]);
	});
});
