import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, type Pinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, ref } from 'vue';
import type { SavedQuery } from '@/models/saved-query';
import { useNotificationsStore } from './notifications';
import { savedQueryKeys, useSavedQueriesQuery, useSavedQueriesStore } from './saved-queries';

vi.mock('@/environment', () => ({ environment: { apiRoot: '/api', saasURL: '' } }));

const savedQuery: Partial<SavedQuery> = { id: 'q1', name: 'Revenue' };

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('saved queries store', () => {
	let fetchMock: ReturnType<typeof vi.fn>;
	let pinia: Pinia;
	let queryClient: QueryClient;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		queryClient = new QueryClient();
		fetchMock = vi.fn(async () => jsonResponse(savedQuery));
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		queryClient.clear();
	});

	function calls(): { url: string; method: string | undefined; body: unknown }[] {
		return fetchMock.mock.calls.map((call) => {
			const [url, init] = call as [string, RequestInit];
			return { url, method: init.method, body: init.body ? JSON.parse(String(init.body)) : undefined };
		});
	}

	function createStore() {
		const app = createApp({ render: () => null });
		app.use(pinia).use(VueQueryPlugin, { queryClient });
		return app.runWithContext(() => useSavedQueriesStore());
	}

	function mountQuery<T>(useComposable: () => T): T {
		let result: T | undefined;
		mount(
			defineComponent({
				setup() {
					result = useComposable();
					return () => h('div');
				},
			}),
			{ global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] } },
		);
		return result as T;
	}

	describe('useSavedQueriesQuery', () => {
		it('waits for a connection id, then fetches its saved queries', async () => {
			fetchMock.mockImplementation(async () => jsonResponse([savedQuery]));
			const connectionId = ref<string | null>(null);
			const { savedQueries } = mountQuery(() => useSavedQueriesQuery(connectionId));
			await flushPromises();
			expect(fetchMock).not.toHaveBeenCalled();
			expect(savedQueries.value).toEqual([]);

			connectionId.value = 'c1';
			await flushPromises();
			expect(calls()[0]).toMatchObject({ url: '/api/connection/c1/saved-queries', method: 'GET' });
			expect(savedQueries.value).toEqual([savedQuery]);
		});

		it('reports a failure with the Angular error message', async () => {
			fetchMock.mockImplementation(async () => jsonResponse({}, 500));
			const { error } = mountQuery(() => useSavedQueriesQuery('c1'));
			await flushPromises();
			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(error.value).toBeInstanceOf(Error);
			expect(useNotificationsStore().snackbars[0]?.message).toBe('Failed to fetch saved queries');
		});
	});

	it('fetchSavedQuery gets one query', async () => {
		const store = createStore();
		expect(await store.fetchSavedQuery('c1', 'q1')).toEqual(savedQuery);
		expect(calls()[0]).toMatchObject({ url: '/api/connection/c1/saved-query/q1', method: 'GET' });
	});

	it('createSavedQuery posts, shows the snackbar and reloads a mounted list', async () => {
		fetchMock.mockImplementation(async (_url: string, init: RequestInit) =>
			jsonResponse(init.method === 'POST' ? savedQuery : [savedQuery]),
		);
		mountQuery(() => useSavedQueriesQuery('c1'));
		await flushPromises();
		const store = createStore();
		const payload = { name: 'Revenue', query_text: 'select 1' };

		expect(await store.createSavedQuery('c1', payload)).toEqual(savedQuery);
		await flushPromises();

		expect(calls()[1]).toEqual({ url: '/api/connection/c1/saved-query', method: 'POST', body: payload });
		expect(calls()[2]).toMatchObject({ url: '/api/connection/c1/saved-queries', method: 'GET' });
		expect(useNotificationsStore().snackbars[0]?.message).toBe('Saved query created successfully');
	});

	it('updateSavedQuery and deleteSavedQuery hit the query url and invalidate the list', async () => {
		const store = createStore();
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

		await store.updateSavedQuery('c1', 'q1', { name: 'New' });
		expect(calls()[0]).toEqual({ url: '/api/connection/c1/saved-query/q1', method: 'PUT', body: { name: 'New' } });
		expect(useNotificationsStore().snackbars[0]?.message).toBe('Saved query updated successfully');

		await store.deleteSavedQuery('c1', 'q1');
		expect(calls()[1]).toMatchObject({ url: '/api/connection/c1/saved-query/q1', method: 'DELETE' });
		expect(useNotificationsStore().snackbars[0]?.message).toBe('Saved query deleted successfully');

		expect(invalidate).toHaveBeenCalledTimes(2);
		expect(invalidate).toHaveBeenCalledWith({ queryKey: savedQueryKeys.list('c1') });
	});

	it('rejects with the notified ApiError on failure and does not invalidate', async () => {
		fetchMock.mockImplementation(async () => jsonResponse({ message: 'Bad SQL', originalMessage: 'syntax' }, 400));
		const store = createStore();
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

		await expect(store.deleteSavedQuery('c1', 'q1')).rejects.toMatchObject({ name: 'ApiError', notified: true });
		expect(useNotificationsStore().alert?.message).toEqual({ abstract: 'Bad SQL', details: 'syntax' });
		expect(invalidate).not.toHaveBeenCalled();
	});

	it('executeSavedQuery posts an empty body, with tableName only when given', async () => {
		const store = createStore();
		await store.executeSavedQuery('c1', 'q1');
		await store.executeSavedQuery('c1', 'q1', 'users');
		expect(calls()).toEqual([
			{ url: '/api/connection/c1/saved-query/q1/execute', method: 'POST', body: {} },
			{ url: '/api/connection/c1/saved-query/q1/execute?tableName=users', method: 'POST', body: {} },
		]);
	});

	it('testQuery posts the query text', async () => {
		const store = createStore();
		await store.testQuery('c1', { query_text: 'select 1', tableName: 'users' });
		expect(calls()[0]).toEqual({
			url: '/api/connection/c1/query/test',
			method: 'POST',
			body: { query_text: 'select 1', tableName: 'users' },
		});
	});
});
