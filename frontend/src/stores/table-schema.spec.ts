import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeError, jsonResponse, mockFetch } from '@/__tests__/mock-fetch';
import { useNotificationsStore } from '@/stores/notifications';
import { useTableSchemaStore } from './table-schema';

vi.mock('@/environment', () => ({ environment: { apiRoot: '', saasURL: '' } }));
vi.mock('@/config', () => ({ getConfig: () => ({ baseURL: '/api', saasURL: '' }) }));

const batch = { batchId: 'b1', changes: [] };

describe('table schema store', () => {
	beforeEach(() => setActivePinia(createPinia()));
	afterEach(() => vi.unstubAllGlobals());

	it('generateSchemaChange posts the prompt and thread', async () => {
		const fetch = mockFetch(jsonResponse(batch));
		expect(await useTableSchemaStore().generateSchemaChange('c1', 'add a column', 'th1')).toEqual(batch);
		expect(fetch.last().url).toBe('/api/table-schema/c1/generate');
		expect(fetch.last().json).toEqual({ userPrompt: 'add a column', threadId: 'th1' });
	});

	it('approve and preview hit their endpoints', async () => {
		const fetch = mockFetch(jsonResponse(batch), jsonResponse({ diff: {} }));
		const store = useTableSchemaStore();
		await store.approveBatch('b1', true);
		await store.previewDiagram('c1', ['ALTER TABLE x']);
		expect(fetch.requests.map((request) => [request.url, request.json])).toEqual([
			['/api/table-schema/batch/b1/approve', { confirmedDestructive: true }],
			['/api/connection/diagram/c1/preview', { sqlCommands: ['ALTER TABLE x'] }],
		]);
	});

	it('generate/approve/preview throw the server message without notifying', async () => {
		mockFetch(jsonResponse(fakeError, 400), jsonResponse({}, 502));
		const showAlert = vi.spyOn(useNotificationsStore(), 'showAlert');
		const showErrorSnackbar = vi.spyOn(useNotificationsStore(), 'showErrorSnackbar');
		const store = useTableSchemaStore();
		await expect(store.generateSchemaChange('c1', 'x')).rejects.toThrow(fakeError.message);
		await expect(store.approveBatch('b1')).rejects.toThrow('Request failed (502)');
		expect(showAlert).not.toHaveBeenCalled();
		expect(showErrorSnackbar).not.toHaveBeenCalled();
	});

	it('rejectBatch and fetchDiagram report the error and reject with the notified ApiError', async () => {
		const fetch = mockFetch(jsonResponse(fakeError, 400), jsonResponse(fakeError, 400));
		const showAlert = vi.spyOn(useNotificationsStore(), 'showAlert');
		const store = useTableSchemaStore();
		await expect(store.rejectBatch('b1')).rejects.toMatchObject({ name: 'ApiError', notified: true });
		await expect(store.fetchDiagram('c1')).rejects.toMatchObject({ name: 'ApiError', notified: true });
		expect(fetch.requests.map((request) => `${request.method} ${request.url}`)).toEqual([
			'POST /api/table-schema/batch/b1/reject',
			'GET /api/connection/diagram/c1',
		]);
		expect(showAlert).toHaveBeenCalledTimes(2);
	});
});
