// Port of dashboard.component.spec.ts, extended to the page's behaviour: loading the folders,
// opening the URL's table (or the default one), the URL state of filters and search, and actions.
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { ApiError } from '@/api/client';
import ActionLinkDialog from '@/components/dashboard/ActionLinkDialog.vue';
import BulkActionConfirmationDialog from '@/components/dashboard/BulkActionConfirmationDialog.vue';
import TableFiltersDialog from '@/components/dashboard/TableFiltersDialog.vue';
import { tableEvents } from '@/lib/table-events';
import DashboardView from './DashboardView.vue';

const tables = vi.hoisted(() => ({
	fetchTablesFolders: vi.fn(),
	fetchTable: vi.fn(),
	activateActions: vi.fn(),
	updateTablesFolders: vi.fn(),
	updatePersonalTableViewSettings: vi.fn(),
}));
const connections = vi.hoisted(() => ({
	canEditConnection: false,
	defaultDisplayTable: null as string | null,
	connection: { title: 'Sakila', type: 'postgres', isTestConnection: false },
}));
const uiSettings = vi.hoisted(() => ({ getUiSettings: vi.fn(), updateConnectionSetting: vi.fn() }));
const dialog = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));
vi.mock('@/stores/table-row', () => ({ useTableRowStore: () => ({ fetchTableRow: vi.fn().mockResolvedValue({}) }) }));
vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => connections }));
vi.mock('@/stores/ui-settings', () => ({ useUiSettingsStore: () => uiSettings }));
vi.mock('@/stores/configuration-state', () => ({ useConfigurationStateStore: () => ({ isConfiguring: () => false }) }));
vi.mock('@/stores/cedar-permissions', () => ({
	useCedarPermissionsStore: () => ({ canI: () => computed(() => true) }),
}));
vi.mock('@/composables/useDialog', () => ({ useDialog: () => dialog }));
vi.mock('@/components/dashboard/analytics', () => ({ track: vi.fn() }));

const permissions = { visibility: true, readonly: false, add: true, delete: true, edit: true };
const fakeTables = [
	{ table: 'actor', permissions },
	{ table: 'city', display_name: 'Cities of the world', permissions },
	{ table: 'film', permissions },
];
const folders = () => [{ category_id: 'all-tables-kitten', category_name: 'All Tables', tables: fakeTables }];

const rowsResponse = {
	rows: [],
	structure: [],
	primaryColumns: [],
	foreignKeys: [],
	widgets: [],
	pagination: { total: 0, lastPage: 1, perPage: 30, currentPage: 1 },
	action_events: [],
	table_settings: { list_fields: [] },
	allow_csv_export: false,
	allow_csv_import: false,
	can_delete: false,
	sortable_by: [],
	configured: true,
};

const stubs = {
	TableView: true,
	TablesList: true,
	TableRowView: true,
	TableAiPanel: true,
	SchemaEditor: true,
};

async function mountPage(url: string) {
	const pinia = createPinia();
	setActivePinia(pinia);
	const router: Router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/dashboard/:connectionId', name: 'dashboard', component: DashboardView },
			{ path: '/dashboard/:connectionId/:tableName', name: 'table', component: DashboardView },
			{ path: '/:pathMatch(.*)*', component: { render: () => null } },
		],
	});
	await router.push(url);
	const wrapper = mount(
		{ template: '<RouterView />' },
		{ global: { plugins: [router, pinia], stubs }, attachTo: document.body },
	);
	await flushPromises();
	return { wrapper, router, tableView: () => wrapper.findComponent({ name: 'TableView' }) };
}

describe('DashboardView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		connections.defaultDisplayTable = null;
		tables.fetchTablesFolders.mockResolvedValue(folders());
		tables.fetchTable.mockResolvedValue(rowsResponse);
		uiSettings.getUiSettings.mockResolvedValue({
			globalSettings: {},
			connections: { conn: { shownTableTitles: true, tables: {} } },
		});
	});

	it('loads the folders and hands the sidebar formatted tables', async () => {
		const { wrapper } = await mountPage('/dashboard/conn/actor');
		expect(tables.fetchTablesFolders).toHaveBeenCalledWith('conn');
		const sidebar = wrapper.findComponent({ name: 'TablesList' });
		const [all] = sidebar.props('tableFolders');
		expect(all.tables.map((table: { table: string }) => table.table)).toEqual(['actor', 'city', 'film']);
		expect(all.tables[1]).toMatchObject({ normalizedTableName: 'Cities of the world', initials: 'CO' });
		expect(sidebar.props('selectedTable')).toBe('actor');
		wrapper.unmount();
	});

	it('opens the first table, keeping the query, when the URL names none', async () => {
		const { wrapper, router } = await mountPage('/dashboard/conn?page_size=100');
		expect(router.currentRoute.value.fullPath).toBe('/dashboard/conn/actor?page_size=100');
		expect(tables.fetchTable).toHaveBeenCalledWith(expect.objectContaining({ tableName: 'actor', chunkSize: 100 }));
		wrapper.unmount();
	});

	it('opens the default table of the connection when it has one', async () => {
		connections.defaultDisplayTable = 'film';
		const { wrapper, router } = await mountPage('/dashboard/conn');
		expect(router.currentRoute.value.path).toBe('/dashboard/conn/film');
		wrapper.unmount();
	});

	it('loads the rows the URL describes and titles the page', async () => {
		const { wrapper, tableView } = await mountPage(
			'/dashboard/conn/city?page_index=2&page_size=100&sort_active=name&sort_direction=DESC&filters=(name:(eq:A))&search=x&uncached=true',
		);
		expect(tables.fetchTable).toHaveBeenCalledWith({
			connectionID: 'conn',
			tableName: 'city',
			requstedPage: 3,
			chunkSize: 100,
			sortColumn: 'name',
			sortOrder: 'DESC',
			filters: { name: { eq: 'A' } },
			comparators: undefined,
			search: 'x',
			uncached: true,
		});
		expect(document.title).toBe('Cities of the world table | Rocketadmin');
		expect(tableView().props()).toMatchObject({
			name: 'city',
			displayName: 'Cities of the world',
			activeFilters: { name: { eq: 'A' } },
			filterComparators: { name: 'eq' },
		});
		wrapper.unmount();
	});

	it('offers the schema editor for a connection without tables', async () => {
		tables.fetchTablesFolders.mockResolvedValue([
			{ category_id: 'all-tables-kitten', category_name: 'All', tables: [] },
		]);
		const { wrapper } = await mountPage('/dashboard/conn');
		expect(wrapper.find('[data-testid="no-tables-generate-schema"]').exists()).toBe(true);
		expect(document.title).toBe('No tables | Rocketadmin');
		wrapper.unmount();
	});

	it('shows the server error with its details', async () => {
		tables.fetchTablesFolders.mockRejectedValue(
			new ApiError('Connection refused', 400, { message: 'Connection refused', originalMessage: 'ECONNREFUSED' }),
		);
		const { wrapper } = await mountPage('/dashboard/conn');
		const banner = wrapper.find('[data-testid="connection-server-error-banner"]');
		expect(banner.text()).toContain('Connection refused');
		expect(banner.text()).toContain('ECONNREFUSED');
		expect(document.title).toBe('Error | Rocketadmin');
		wrapper.unmount();
	});

	it('searches from the first page, without filters, and puts the search in the URL', async () => {
		const { wrapper, router, tableView } = await mountPage('/dashboard/conn/actor?page_index=3&filters=(id:(gt:1))');
		tableView().vm.$emit('search', 'penelope');
		await flushPromises();
		expect(router.currentRoute.value.query).toEqual({ page_index: '0', page_size: '30', search: 'penelope' });
		expect(tables.fetchTable).toHaveBeenLastCalledWith(
			expect.objectContaining({ requstedPage: 1, filters: {}, search: 'penelope' }),
		);
		wrapper.unmount();
	});

	it('applies the filters dialog and writes them to the URL', async () => {
		dialog.open.mockReturnValue({
			afterClosed: () =>
				Promise.resolve({
					action: 'filter',
					filters: { name: 'Pe', id: undefined },
					comparators: { name: 'startswith' },
				}),
		});
		const { wrapper, router, tableView } = await mountPage('/dashboard/conn/actor');
		const structure = { structure: [], foreignKeysList: [], foreignKeys: {}, widgets: {} };
		tableView().vm.$emit('openFilters', structure);
		await flushPromises();
		expect(dialog.open).toHaveBeenCalledWith(TableFiltersDialog, {
			data: { connectionID: 'conn', tableName: 'actor', displayTableName: 'Actors', structure },
		});
		expect(router.currentRoute.value.query).toEqual({
			filters: '(name:(startswith:Pe))',
			page_index: '0',
			page_size: '30',
		});
		expect(tables.fetchTable).toHaveBeenLastCalledWith(
			expect.objectContaining({ filters: { name: { startswith: 'Pe' } } }),
		);
		wrapper.unmount();
	});

	it('resets the filters from the dialog', async () => {
		dialog.open.mockReturnValue({
			afterClosed: () => Promise.resolve({ action: 'reset', filters: {}, comparators: {} }),
		});
		const { wrapper, router, tableView } = await mountPage('/dashboard/conn/actor?filters=(id:(gt:1))');
		tableView().vm.$emit('openFilters', { structure: [], foreignKeysList: [], foreignKeys: {}, widgets: {} });
		await flushPromises();
		expect(router.currentRoute.value.fullPath).toBe('/dashboard/conn/actor');
		expect(tables.fetchTable).toHaveBeenLastCalledWith(expect.objectContaining({ filters: {} }));
		wrapper.unmount();
	});

	it('applies the filters a chip edit returned without opening the dialog again', async () => {
		const { wrapper, router, tableView } = await mountPage('/dashboard/conn/actor');
		tableView().vm.$emit('openFilters', {
			structure: [],
			foreignKeysList: [],
			foreignKeys: {},
			widgets: {},
			filters: { id: 3 },
			comparators: { id: 'gt' },
		});
		await flushPromises();
		expect(dialog.open).not.toHaveBeenCalled();
		expect(router.currentRoute.value.query.filters).toBe('(id:(gt:3))');
		wrapper.unmount();
	});

	it('removes one filter and clears them all', async () => {
		const { wrapper, router, tableView } = await mountPage('/dashboard/conn/actor?filters=(id:(gt:1),name:(eq:A))');
		tableView().vm.$emit('removeFilter', 'id');
		await flushPromises();
		expect(router.currentRoute.value.query).toEqual({ filters: '(name:(eq:A))', page_index: '0', page_size: '30' });
		tableView().vm.$emit('resetAllFilters');
		await flushPromises();
		expect(router.currentRoute.value.query).toEqual({ page_index: '0', page_size: '30' });
		expect(tables.fetchTable).toHaveBeenLastCalledWith(expect.objectContaining({ filters: {} }));
		wrapper.unmount();
	});

	it('applies a saved filter', async () => {
		const { wrapper, tableView } = await mountPage('/dashboard/conn/actor');
		tableView().vm.$emit('applyFilter', { filters: { id: { eq: 9 } } });
		await flushPromises();
		expect(tables.fetchTable).toHaveBeenLastCalledWith(expect.objectContaining({ filters: { id: { eq: 9 } } }));
		wrapper.unmount();
	});

	it('confirms an action that requires it, and runs one that does not', async () => {
		tables.activateActions.mockResolvedValue({ location: 'https://example.com' });
		const { wrapper, tableView } = await mountPage('/dashboard/conn/actor');
		const action = { id: 'a1', title: 'Ping', type: 'single', require_confirmation: true };
		tableView().vm.$emit('activateActions', { action, primaryKeys: [{ id: 1 }], identityFieldValues: ['Pe'] });
		expect(dialog.open).toHaveBeenCalledWith(BulkActionConfirmationDialog, {
			data: {
				id: 'a1',
				title: 'Ping',
				primaryKeys: [{ id: 1 }],
				identityFieldValues: ['Pe'],
				tableDisplayName: 'Actors',
			},
		});

		tableView().vm.$emit('activateActions', {
			action: { ...action, require_confirmation: false },
			primaryKeys: [{ id: 1 }],
		});
		await flushPromises();
		expect(tables.activateActions).toHaveBeenCalledWith('conn', 'actor', 'a1', 'Ping', [{ id: 1 }]);
		expect(dialog.open).toHaveBeenLastCalledWith(ActionLinkDialog, {
			data: { href: 'https://example.com', actionName: 'Ping', primaryKeys: { id: 1 } },
		});
		wrapper.unmount();
	});

	it('reloads the rows after rows were deleted or imported', async () => {
		const { wrapper } = await mountPage('/dashboard/conn/actor');
		const calls = tables.fetchTable.mock.calls.length;
		tableEvents.emit('rowsDeleted', { connectionID: 'conn', tableName: 'actor' });
		tableEvents.emit('imported', { connectionID: 'conn', tableName: 'actor' });
		await flushPromises();
		expect(tables.fetchTable.mock.calls.length).toBe(calls + 2);
		wrapper.unmount();
	});

	it('collapses the sidebar and remembers it', async () => {
		const { wrapper } = await mountPage('/dashboard/conn/actor');
		const collapse = wrapper.findAll('button').find((button) => button.text().includes('Collapse'));
		await collapse?.trigger('click');
		expect(uiSettings.updateConnectionSetting).toHaveBeenCalledWith('conn', 'shownTableTitles', false);
		expect(wrapper.findComponent({ name: 'TablesList' }).props('collapsed')).toBe(true);
		wrapper.unmount();
	});
});
