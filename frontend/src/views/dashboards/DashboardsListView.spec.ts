import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Ref, ref } from 'vue';
import { byText, mountPage } from '@/components/dashboards/__tests__/mount-page';
import type { Dashboard } from '@/models/dashboard';
import DashboardsListView from './DashboardsListView.vue';

const state = vi.hoisted(() => ({
	connectionIds: [] as string[],
	dashboards: undefined as unknown,
	loading: undefined as unknown,
}));
const track = vi.hoisted(() => vi.fn());
vi.mock('@/stores/dashboards', () => ({
	useDashboardsQuery: (connectionId: Ref<string>) => {
		state.connectionIds.push(connectionId.value);
		return { dashboards: state.dashboards, loading: state.loading };
	},
	useDashboardsStore: () => ({ createDashboard: vi.fn(), updateDashboard: vi.fn(), deleteDashboard: vi.fn() }),
}));
vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => ({ connectionTitle: 'Test Connection' }) }));
vi.mock('@/stores/ui-settings', () => ({
	useUiSettingsStore: () => ({ getUiSettings: vi.fn(async () => null), updateConnectionSetting: vi.fn() }),
}));
vi.mock('@/components/dashboards/analytics', () => ({ trackDashboardsEvent: track }));

const sales: Dashboard = {
	id: 'd1',
	name: 'Sales',
	description: 'Monthly numbers',
	connection_id: 'conn-1',
	created_at: '2024-01-01',
	updated_at: '2024-03-05T12:00:00Z',
	widgets: [{ id: 'w1', position_x: 0, position_y: 0, width: 4, height: 4, query_id: 'q', dashboard_id: 'd1' }],
};
const ops: Dashboard = { ...sales, id: 'd2', name: 'Ops', description: null, widgets: [] };

const open = () => mountPage(DashboardsListView, '/dashboards/:connectionId', '/dashboards/conn-1');

describe('DashboardsListView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		state.connectionIds = [];
		state.dashboards = ref<Dashboard[]>([sales, ops]);
		state.loading = ref(false);
	});

	it('lists the dashboards of the connection as cards', async () => {
		const { wrapper } = await open();

		expect(state.connectionIds).toEqual(['conn-1']);
		expect(document.title).toBe('Dashboards | Test Connection');
		const first = wrapper.get('[data-testid="dashboard-card-0"]');
		expect(first.text()).toContain('Sales');
		expect(first.text()).toContain('Monthly numbers');
		expect(first.text()).toContain('1 panels');
		expect(first.text()).toContain('Mar 5, 2024');
		expect(byText(wrapper, 'Sales', 'a').attributes('href')).toBe('/dashboards/conn-1/d1');
		expect(wrapper.get('[data-testid="dashboard-card-1"]').text()).toContain('Connect your first panel');
		wrapper.unmount();
	});

	it('shows the skeleton while loading', async () => {
		(state.loading as Ref<boolean>).value = true;
		const { wrapper } = await open();

		expect(wrapper.find('[aria-label="Loading dashboards"]').exists()).toBe(true);
		wrapper.unmount();
	});

	it('filters by name and description', async () => {
		const { wrapper } = await open();
		const search = wrapper.get('[data-testid="dashboards-search-input"]');

		await search.setValue('monthly');
		expect(wrapper.findAll('[data-testid^="dashboard-card-"]')).toHaveLength(1);
		await search.setValue('ops');
		expect(wrapper.get('[data-testid="dashboard-card-0"]').text()).toContain('Ops');
		await search.setValue('nothing');
		expect(wrapper.text()).toContain('No dashboards match your search criteria.');
		wrapper.unmount();
	});

	it('explains dashboards when there are none', async () => {
		(state.dashboards as Ref<Dashboard[]>).value = [];
		const { wrapper } = await open();

		expect(wrapper.text()).toContain('No dashboards yet');
		expect(wrapper.text()).toContain('Dashboards help you visualize your data');
		wrapper.unmount();
	});

	it('opens the create dialog', async () => {
		const { wrapper } = await open();

		await wrapper.get('[data-testid="create-dashboard-button"]').trigger('click');
		await flushPromises();

		expect(track).toHaveBeenCalledWith('Dashboards: create dashboard dialog opened');
		expect(wrapper.get('h2').text()).toBe('Create dashboard');
		wrapper.unmount();
	});

	it('opens the edit and delete dialogs from the card menu', async () => {
		const { wrapper } = await open();

		await wrapper.get('[data-testid="dashboard-actions-0-button"]').trigger('click');
		await wrapper.get('[data-testid="dashboard-edit-0-menu-item"]').trigger('click');
		await flushPromises();
		expect(track).toHaveBeenCalledWith('Dashboards: edit dashboard dialog opened');
		expect(wrapper.get('h2').text()).toBe('Edit dashboard');
		await byText(wrapper, 'Cancel').trigger('click');
		await flushPromises();

		await wrapper.get('[data-testid="dashboard-actions-0-button"]').trigger('click');
		await wrapper.get('[data-testid="dashboard-delete-0-menu-item"]').trigger('click');
		await flushPromises();
		expect(track).toHaveBeenCalledWith('Dashboards: delete dashboard dialog opened');
		expect(wrapper.text()).toContain('Are you sure you want to delete the dashboard Sales?');
		wrapper.unmount();
	});
});
