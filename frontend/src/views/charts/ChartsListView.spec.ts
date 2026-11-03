import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { mountPage } from '@/components/dashboards/__tests__/mount-page';
import type { SavedQuery } from '@/models/saved-query';
import ChartsListView from './ChartsListView.vue';

const state = vi.hoisted(() => ({
	connectionIds: [] as unknown[],
	savedQueries: null as unknown as import('vue').Ref<SavedQuery[]>,
	loading: null as unknown as import('vue').Ref<boolean>,
	deleteSavedQuery: vi.fn(),
}));
const track = vi.hoisted(() => vi.fn());
vi.mock('@/stores/saved-queries', () => ({
	useSavedQueriesQuery: (connectionId: unknown) => {
		state.connectionIds.push(connectionId);
		return { savedQueries: state.savedQueries, loading: state.loading };
	},
	useSavedQueriesStore: () => ({ deleteSavedQuery: state.deleteSavedQuery }),
}));
vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => ({ connectionTitle: 'Test Connection' }) }));
vi.mock('@/stores/ui-settings', () => ({
	useUiSettingsStore: () => ({ getUiSettings: vi.fn(async () => null), updateConnectionSetting: vi.fn() }),
}));
vi.mock('@/components/dashboards/analytics', () => ({ trackDashboardsEvent: track }));

const query: SavedQuery = {
	id: '1',
	name: 'Test Query',
	description: 'Test description',
	widget_type: 'chart',
	chart_type: 'pie',
	widget_options: null,
	query_text: 'SELECT * FROM users',
	connection_id: 'conn-1',
	created_at: '2024-01-01',
	updated_at: '2024-01-01T00:00:00Z',
};
const other: SavedQuery = { ...query, id: '2', name: 'Revenue', description: null, chart_type: null };

const open = () => mountPage(ChartsListView, '/panels/:connectionId', '/panels/conn-1');

describe('ChartsListView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		state.connectionIds = [];
		state.savedQueries = ref([query, other]);
		state.loading = ref(false);
	});

	it('loads the saved queries of the connection and sets the title', async () => {
		const { wrapper } = await open();

		expect(state.connectionIds).toHaveLength(1);
		expect(document.title).toBe('Charts | Test Connection');
		expect(wrapper.get('h1').text()).toBe('Panels');
		const rows = wrapper.findAll('tbody tr');
		expect(rows).toHaveLength(2);
		expect(rows[0]?.text()).toContain('Test Query');
		expect(rows[0]?.text()).toContain('Test description');
		expect(rows[1]?.text()).toContain('—');
		expect(wrapper.find('[data-chart-type="pie"]').exists()).toBe(true);
		expect(wrapper.find('[data-chart-type="bar"]').exists()).toBe(true);
		wrapper.unmount();
	});

	it('shows the skeleton while loading', async () => {
		state.loading.value = true;
		const { wrapper } = await open();

		expect(wrapper.find('[role="status"]').exists()).toBe(true);
		expect(wrapper.find('table').exists()).toBe(false);
		wrapper.unmount();
	});

	it('filters by name and by description', async () => {
		const { wrapper } = await open();
		const search = wrapper.get('[data-testid="panels-search-input"]');

		await search.setValue('revenue');
		expect(wrapper.findAll('tbody tr')).toHaveLength(1);
		expect(wrapper.get('tbody').text()).toContain('Revenue');

		await search.setValue('DESCRIPTION');
		expect(wrapper.findAll('tbody tr')).toHaveLength(1);
		expect(wrapper.get('tbody').text()).toContain('Test Query');

		await search.setValue('nonexistent');
		expect(wrapper.find('table').exists()).toBe(false);
		expect(wrapper.text()).toContain('No panels match your search criteria.');
		expect(wrapper.find('[data-testid="create-panel-button"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('invites to create the first panel when there are none', async () => {
		state.savedQueries.value = [];
		const { wrapper } = await open();

		expect(wrapper.text()).toContain('No panels found');
		expect(wrapper.text()).toContain('Create your first panel to visualize your data.');
		expect(wrapper.find('a[href="/panels/conn-1/new"]').exists()).toBe(true);
		wrapper.unmount();
	});

	it('links to the editor for a new panel', async () => {
		const { wrapper } = await open();
		const create = wrapper.get('[data-testid="create-panel-button"]');

		expect(create.attributes('href')).toBe('/panels/conn-1/new');
		await create.trigger('click');
		expect(track).toHaveBeenCalledWith('Charts: create chart page opened');
		wrapper.unmount();
	});

	it('opens the editor when a row is clicked', async () => {
		const { wrapper, router } = await open();

		await wrapper.findAll('tbody tr')[1]?.trigger('click');
		await flushPromises();

		expect(track).toHaveBeenCalledWith('Charts: edit chart page opened');
		expect(router.currentRoute.value.path).toBe('/panels/conn-1/2');
		wrapper.unmount();
	});

	it('opens the delete dialog from the row menu', async () => {
		const { wrapper } = await open();

		await wrapper.get('[data-testid="panel-actions-0-button"]').trigger('click');
		expect(wrapper.get('[data-testid="panel-edit-0-menu-item"]').attributes('href')).toBe('/panels/conn-1/1');
		await wrapper.get('[data-testid="panel-delete-0-menu-item"]').trigger('click');
		await flushPromises();

		expect(track).toHaveBeenCalledWith('Charts: delete chart dialog opened');
		expect(wrapper.text()).toContain('Are you sure you want to delete the query Test Query?');
		wrapper.unmount();
	});
});
