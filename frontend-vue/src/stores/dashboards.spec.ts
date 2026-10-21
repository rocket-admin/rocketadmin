import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, type Pinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, ref } from 'vue';
import type { Dashboard, DashboardWidget } from '@/models/dashboard';
import { dashboardKeys, useDashboardQuery, useDashboardsQuery, useDashboardsStore } from './dashboards';
import { useNotificationsStore } from './notifications';

vi.mock('@/environment', () => ({ environment: { apiRoot: '/api', saasURL: '' } }));

const dashboard: Dashboard = {
	id: 'd1',
	name: 'Sales',
	description: null,
	connection_id: 'c1',
	created_at: '2024-01-01',
	updated_at: '2024-01-01',
};
const widget: DashboardWidget = {
	id: 'w1',
	position_x: 0,
	position_y: 0,
	width: 4,
	height: 3,
	query_id: 'q1',
	dashboard_id: 'd1',
};

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('dashboards store', () => {
	let fetchMock: ReturnType<typeof vi.fn>;
	let pinia: Pinia;
	let queryClient: QueryClient;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		queryClient = new QueryClient();
		fetchMock = vi.fn(async () => jsonResponse(dashboard));
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

	// The store needs the query client from the app's injection context, like in main.ts.
	function createStore() {
		const app = createApp({ render: () => null });
		app.use(pinia).use(VueQueryPlugin, { queryClient });
		return app.runWithContext(() => useDashboardsStore());
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

	describe('useDashboardsQuery', () => {
		it('does not fetch without a connection id and exposes an empty list', async () => {
			const { dashboards, loading } = mountQuery(() => useDashboardsQuery(null));
			await flushPromises();
			expect(fetchMock).not.toHaveBeenCalled();
			expect(dashboards.value).toEqual([]);
			expect(loading.value).toBe(false);
		});

		it('fetches the dashboards of the connection and refetches when the id changes', async () => {
			fetchMock.mockImplementation(async () => jsonResponse([dashboard]));
			const connectionId = ref('c1');
			const { dashboards } = mountQuery(() => useDashboardsQuery(connectionId));
			await flushPromises();
			expect(calls()[0]).toMatchObject({ url: '/api/dashboards/c1', method: 'GET' });
			expect(dashboards.value).toEqual([dashboard]);

			connectionId.value = 'c2';
			await flushPromises();
			expect(calls()[1]?.url).toBe('/api/dashboards/c2');
		});

		it('reports a failure once with the Angular error message and exposes the error', async () => {
			fetchMock.mockImplementation(async () => jsonResponse({ message: 'boom' }, 500));
			const { dashboards, error } = mountQuery(() => useDashboardsQuery('c1'));
			await flushPromises();
			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(error.value).toBeInstanceOf(Error);
			expect(dashboards.value).toEqual([]);
			expect(useNotificationsStore().snackbars[0]?.message).toBe('Failed to fetch dashboards');
		});

		it('refresh() refetches', async () => {
			fetchMock.mockImplementation(async () => jsonResponse([dashboard]));
			const { refresh } = mountQuery(() => useDashboardsQuery('c1'));
			await flushPromises();
			await refresh();
			expect(fetchMock).toHaveBeenCalledTimes(2);
		});
	});

	describe('useDashboardQuery', () => {
		it('needs both ids, then fetches the dashboard with its widgets', async () => {
			const dashboardId = ref<string | null>(null);
			const { dashboard: current } = mountQuery(() => useDashboardQuery('c1', dashboardId));
			await flushPromises();
			expect(fetchMock).not.toHaveBeenCalled();
			expect(current.value).toBeNull();

			dashboardId.value = 'd1';
			await flushPromises();
			expect(calls()[0]).toMatchObject({ url: '/api/dashboard/d1/c1', method: 'GET' });
			expect(current.value).toEqual(dashboard);
		});
	});

	describe('dashboard CRUD', () => {
		it('createDashboard posts, shows the success snackbar and invalidates the list', async () => {
			const store = createStore();
			const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
			const result = await store.createDashboard('c1', { name: 'Sales' });

			expect(result).toEqual(dashboard);
			expect(calls()[0]).toEqual({ url: '/api/dashboards/c1', method: 'POST', body: { name: 'Sales' } });
			expect(useNotificationsStore().snackbars[0]?.message).toBe('Dashboard created successfully');
			expect(invalidate).toHaveBeenCalledWith({ queryKey: dashboardKeys.list('c1') });
		});

		it('updateDashboard puts to the dashboard url', async () => {
			const store = createStore();
			await store.updateDashboard('c1', 'd1', { name: 'New' });
			expect(calls()[0]).toEqual({ url: '/api/dashboard/d1/c1', method: 'PUT', body: { name: 'New' } });
			expect(useNotificationsStore().snackbars[0]?.message).toBe('Dashboard updated successfully');
		});

		it('deleteDashboard deletes and reloads a mounted list', async () => {
			fetchMock.mockImplementation(async (_url: string, init: RequestInit) =>
				jsonResponse(init.method === 'DELETE' ? dashboard : [dashboard]),
			);
			mountQuery(() => useDashboardsQuery('c1'));
			await flushPromises();
			const store = createStore();

			await store.deleteDashboard('c1', 'd1');
			await flushPromises();

			expect(calls().map((c) => `${c.method} ${c.url}`)).toEqual([
				'GET /api/dashboards/c1',
				'DELETE /api/dashboard/d1/c1',
				'GET /api/dashboards/c1',
			]);
			expect(useNotificationsStore().snackbars[0]?.message).toBe('Dashboard deleted successfully');
		});

		it('rejects with the notified ApiError on failure and does not invalidate', async () => {
			fetchMock.mockImplementation(async () => jsonResponse({ message: 'Name taken' }, 400));
			const store = createStore();
			const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

			await expect(store.createDashboard('c1', { name: 'Sales' })).rejects.toMatchObject({
				name: 'ApiError',
				notified: true,
			});
			expect(useNotificationsStore().snackbars[0]?.message).toBe('Name taken');
			expect(invalidate).not.toHaveBeenCalled();
		});
	});

	describe('widgets', () => {
		beforeEach(() => {
			fetchMock.mockImplementation(async () => jsonResponse(widget));
		});

		it('createWidget posts to the widget url and invalidates the list', async () => {
			const store = createStore();
			const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
			const payload = { position_x: 0, position_y: 0, width: 4, height: 3, query_id: 'q1' };

			expect(await store.createWidget('c1', 'd1', payload)).toEqual(widget);
			expect(calls()[0]).toEqual({ url: '/api/dashboard/d1/widget/c1', method: 'POST', body: payload });
			expect(useNotificationsStore().snackbars[0]?.message).toBe('Widget created successfully');
			expect(invalidate).toHaveBeenCalledWith({ queryKey: dashboardKeys.list('c1') });
		});

		it('updateWidget and updateWidgetPosition put silently', async () => {
			const store = createStore();
			const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
			await store.updateWidget('c1', 'd1', 'w1', { query_id: 'q2' });
			await store.updateWidgetPosition('c1', 'd1', 'w1', { position_x: 1, position_y: 2, width: 3, height: 4 });

			expect(calls()).toEqual([
				{ url: '/api/dashboard/d1/widget/w1/c1', method: 'PUT', body: { query_id: 'q2' } },
				{
					url: '/api/dashboard/d1/widget/w1/c1',
					method: 'PUT',
					body: { position_x: 1, position_y: 2, width: 3, height: 4 },
				},
			]);
			expect(useNotificationsStore().snackbars).toEqual([]);
			expect(invalidate).not.toHaveBeenCalled();
		});

		it('deleteWidget deletes, shows the snackbar and invalidates the list', async () => {
			const store = createStore();
			const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
			await store.deleteWidget('c1', 'd1', 'w1');
			expect(calls()[0]).toMatchObject({ url: '/api/dashboard/d1/widget/w1/c1', method: 'DELETE' });
			expect(useNotificationsStore().snackbars[0]?.message).toBe('Widget deleted successfully');
			expect(invalidate).toHaveBeenCalledOnce();
		});

		it('generateWidgetWithAi posts the description', async () => {
			const store = createStore();
			await store.generateWidgetWithAi('c1', { chart_description: 'sales by month' });
			expect(calls()[0]).toEqual({
				url: '/api/widget/generate/c1',
				method: 'POST',
				body: { chart_description: 'sales by month' },
			});
		});
	});
});
