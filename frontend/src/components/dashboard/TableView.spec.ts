// Port of db-table-view.component.spec.ts, as behaviour: what the view emits, fetches and writes
// to the URL. The rows (`table`) and `selection` are the dashboard's, built here directly.
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h, reactive } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { vTooltip } from '@/components/ui';
import { useRowSelection } from '@/composables/useRowSelection';
import { createTableDataState, type TableData, type TableDataRow } from '@/composables/useTableData';
import type { TableField } from '@/models/table';
import { useTableStateStore } from '@/stores/table-state';
import TableView from './TableView.vue';

const tables = vi.hoisted(() => ({ updatePersonalTableViewSettings: vi.fn() }));
const tableRow = vi.hoisted(() => ({ fetchTableRow: vi.fn() }));
const dialog = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));
vi.mock('@/stores/table-row', () => ({ useTableRowStore: () => tableRow }));
vi.mock('@/stores/connections', () => ({
	useConnectionsStore: () => ({ canEditConnection: true, connection: { type: 'postgres' } }),
}));
vi.mock('@/stores/cedar-permissions', () => ({
	useCedarPermissionsStore: () => ({ canI: () => computed(() => true) }),
}));
vi.mock('@/composables/useDialog', () => ({ useDialog: () => dialog }));
vi.mock('./analytics', () => ({ track: vi.fn() }));

const SavedFiltersPanelStub = defineComponent({
	name: 'SavedFiltersPanel',
	props: [
		'connectionID',
		'selectedTableName',
		'selectedTableDisplayName',
		'structure',
		'tableWidgets',
		'tableForeignKeys',
		'tableTypes',
	],
	emits: ['filterSelected'],
	setup: (_props, { expose }) => {
		expose({ handleOpenSavedFiltersDialog: vi.fn(), savedFilterData: [] });
		return () => h('div', { class: 'saved-filters-stub' });
	},
});

const field = (column_name: string, data_type = 'varchar'): TableField => ({
	column_name,
	column_default: null,
	data_type,
	isExcluded: false,
	isSearched: false,
	allow_null: true,
	auto_increment: false,
	character_maximum_length: null,
});

function tableData(overrides: Partial<ReturnType<typeof createTableDataState>> = {}): TableData {
	const state = reactive({
		...createTableDataState(),
		rows: [
			{ id: 1, name: 'Ann' },
			{ id: 2, name: 'Bob' },
		] as TableDataRow[],
		structure: [field('id', 'integer'), field('name')],
		keyAttributes: [{ column_name: 'id' }],
		columns: [
			{ title: 'id', normalizedTitle: 'ID', selected: true },
			{ title: 'name', normalizedTitle: 'Name', selected: true },
		],
		dataColumns: ['id', 'name'],
		dataNormalizedColumns: { id: 'ID', name: 'Name' },
		displayedColumns: ['select', 'id', 'name', 'actions'],
		displayedDataColumns: ['id', 'name'],
		tableTypes: { id: 'integer', name: 'text' },
		canDelete: true,
		isExportAllowed: true,
		identityColumn: 'name',
		total: 95,
		defaultSort: null,
		...overrides,
	});
	return Object.assign(state, {
		fetchRows: vi.fn<TableData['fetchRows']>().mockResolvedValue(undefined),
		changeColumnList: vi.fn<TableData['changeColumnList']>(),
		getQueryParams: (row: TableDataRow, action?: 'dub') => ({ id: row.id, ...(action ? { action } : {}) }),
	});
}

async function mountView(
	options: { table?: TableData; query?: string; activeFilters?: Record<string, Record<string, unknown>> } = {},
) {
	const pinia = createPinia();
	setActivePinia(pinia);
	const router: Router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
	});
	await router.push(`/dashboard/conn/users${options.query ?? ''}`);
	const table = options.table ?? tableData();
	const selection = useRowSelection();
	const wrapper = mount(TableView, {
		props: {
			name: 'users',
			displayName: 'Users',
			connectionID: 'conn',
			table,
			selection,
			activeFilters: options.activeFilters ?? {},
		},
		global: {
			plugins: [router, pinia],
			directives: { tooltip: vTooltip },
			stubs: { SavedFiltersPanel: SavedFiltersPanelStub },
		},
		attachTo: document.body,
	});
	// The display widgets are async components.
	await flushPromises();
	await new Promise((resolve) => setTimeout(resolve));
	await flushPromises();
	return { wrapper, router, table, selection };
}

function buttonByText(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], text: string) {
	// Icon ligatures are text too: match the label at the end.
	const match = wrapper.findAll('button').find((candidate) => candidate.text().endsWith(text));
	if (!match) throw new Error(`No button "${text}"`);
	return match;
}

describe('TableView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tables.updatePersonalTableViewSettings.mockResolvedValue(undefined);
	});

	it('renders the page of rows through the display widgets', async () => {
		const { wrapper } = await mountView();
		expect(wrapper.find('h2').text()).toBe('Users');
		await vi.waitFor(() => expect(wrapper.find('table').text()).toContain('Ann'));
		expect(wrapper.find('table').text()).toContain('Bob');
		expect(wrapper.find('[data-testid="table-edit-record-0-link"]').attributes('href')).toBe(
			'/dashboard/conn/users/entry?id=1',
		);
		expect(wrapper.find('[data-testid="table-duplicate-record-1-link"]').attributes('href')).toBe(
			'/dashboard/conn/users/entry?id=2&action=dub',
		);
		wrapper.unmount();
	});

	it('emits openFilters with the table structure and clears the search', async () => {
		const { wrapper, table } = await mountView({ query: '?search=ann' });
		await wrapper.find('[data-testid="table-filter-button"]').trigger('click');
		expect(wrapper.emitted('openFilters')?.[0]).toEqual([
			{ structure: table.structure, foreignKeysList: [], foreignKeys: {}, widgets: {} },
		]);
		expect((wrapper.find('input[name="search"]').element as HTMLInputElement).value).toBe('');
		wrapper.unmount();
	});

	it('emits the trimmed search, and null when it is cleared', async () => {
		const { wrapper } = await mountView();
		await wrapper.find('input[name="search"]').setValue('  kenny ');
		await wrapper.find('form[role="search"]').trigger('submit');
		expect(wrapper.emitted('search')?.[0]).toEqual(['kenny']);
		await wrapper.find('button[aria-label="Clear search"]').trigger('click');
		expect(wrapper.emitted('search')?.[1]).toEqual([null]);
		wrapper.unmount();
	});

	it('shows a chip per active filter, removable and editable', async () => {
		dialog.open.mockReturnValue({
			afterClosed: () =>
				Promise.resolve({ action: 'filter', filters: { name: 'B' }, comparators: { name: 'startswith' } }),
		});
		const { wrapper } = await mountView({ activeFilters: { name: { startswith: 'A' }, id: { gt: 5 } } });
		const chips = wrapper.findAll('[data-testid="active-filter-chip"]');
		expect(chips.map((chip) => chip.find('button').text())).toEqual(['Names = A...', 'Ids > 5']);

		await chips[1]?.find('button[aria-label="Remove filter"]').trigger('click');
		expect(wrapper.emitted('removeFilter')?.[0]).toEqual(['id']);

		await chips[0]?.find('button').trigger('click');
		await flushPromises();
		expect(dialog.open.mock.calls[0]?.[1]).toMatchObject({ data: { tableName: 'users', autofocusField: 'name' } });
		expect(wrapper.emitted('openFilters')?.[0]?.[0]).toMatchObject({
			filters: { name: 'B' },
			comparators: { name: 'startswith' },
		});
		wrapper.unmount();
	});

	it('hides the chips while a saved filter is active', async () => {
		const { wrapper } = await mountView({ query: '?saved_filter=f1', activeFilters: { name: { eq: 'A' } } });
		expect(wrapper.find('[data-testid="active-filter-chip"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('sorts from the header menu: writes the URL and loads the page', async () => {
		const { wrapper, router, table } = await mountView({ activeFilters: { name: { eq: 'A' } } });
		await buttonByText(wrapper, 'Descending (Z-A)').trigger('click');
		await flushPromises();
		expect(router.currentRoute.value.query).toEqual({
			filters: '(name:(eq:A))',
			sort_active: 'id',
			sort_direction: 'DESC',
			page_index: '0',
			page_size: '30',
		});
		expect(table.fetchRows).toHaveBeenCalledWith(
			expect.objectContaining({ sortColumn: 'id', sortOrder: 'DESC', isTablePageSwitched: true, tableName: 'users' }),
		);
		wrapper.unmount();
	});

	it('pages: writes page_index/page_size and loads that page', async () => {
		const { wrapper, router, table } = await mountView();
		await wrapper.find('button[aria-label="Next page"]').trigger('click');
		await flushPromises();
		expect(router.currentRoute.value.query).toMatchObject({ page_index: '1', page_size: '30' });
		expect(table.fetchRows).toHaveBeenCalledWith(expect.objectContaining({ requstedPage: 1, pageSize: 30 }));
		wrapper.unmount();
	});

	it('starts from the URL sort, else from the table default sort', async () => {
		const fromUrl = await mountView({ query: '?sort_active=name&sort_direction=DESC' });
		expect(fromUrl.wrapper.find('td[data-label="Name ↓"]').exists()).toBe(true);
		fromUrl.wrapper.unmount();

		const table = tableData({ defaultSort: { column: 'name', direction: 'asc' } });
		const fromDefault = await mountView({ table });
		expect(fromDefault.wrapper.find('td[data-label="Name ↑"]').exists()).toBe(true);
		await buttonByText(fromDefault.wrapper, 'Remove default').trigger('click');
		expect(tables.updatePersonalTableViewSettings).toHaveBeenCalledWith('conn', 'users', {
			ordering: null,
			ordering_field: null,
		});
		fromDefault.wrapper.unmount();
	});

	it('opens the row in the side panel on a row click', async () => {
		const { wrapper } = await mountView();
		await wrapper.findAll('tbody tr')[1]?.trigger('click');
		const tableState = useTableStateStore();
		expect(tableState.selectedRow).toMatchObject({
			connectionID: 'conn',
			tableName: 'users',
			record: { id: 2, name: 'Bob' },
			primaryKeys: { id: 2 },
			link: '/dashboard/conn/users/entry',
		});
		await flushPromises();
		expect(wrapper.findAll('tbody tr')[1]?.classes()).toContain('table-view__row--open');
		wrapper.unmount();
	});

	it('asks to delete a row with its identity value', async () => {
		const { wrapper } = await mountView();
		await wrapper.find('[data-testid="table-delete-record-0-button"]').trigger('click');
		expect(wrapper.emitted('activateActions')?.[0]).toEqual([
			{
				action: { title: 'Delete row', type: 'multiple', require_confirmation: true },
				primaryKeys: [{ id: 1 }],
				identityFieldValues: ['Ann'],
			},
		]);
		wrapper.unmount();
	});

	it('shows the bulk actions for the selected rows', async () => {
		const { wrapper, selection } = await mountView();
		await wrapper.find('input[aria-label="select row 2"]').setValue(true);
		expect(selection.keys).toEqual([JSON.stringify({ id: 2 })]);
		await flushPromises();
		expect(wrapper.find('[data-testid="table-bulk-actions"]').exists()).toBe(true);
		await buttonByText(wrapper, 'Delete').trigger('click');
		expect(wrapper.emitted('activateActions')?.[0]).toEqual([
			{
				action: { title: 'Delete rows', type: 'multiple', require_confirmation: true },
				primaryKeys: [{ id: 2 }],
				identityFieldValues: ['Bob'],
			},
		]);
		await buttonByText(wrapper, 'Select all').trigger('click');
		expect(selection.keys).toHaveLength(2);
		wrapper.unmount();
	});

	it('saves the visible columns when one is hidden', async () => {
		const { wrapper, table } = await mountView();
		await wrapper.find('[aria-controls="table-view-columns"]').trigger('click');
		const checkbox = wrapper.findAll('#table-view-columns input[type="checkbox"]')[1];
		await checkbox?.setValue(false);
		expect(table.changeColumnList).toHaveBeenCalled();
		expect(tables.updatePersonalTableViewSettings).toHaveBeenCalledWith('conn', 'users', {
			columns_view: ['id', 'name'],
			list_fields: ['id', 'name'],
		});
		wrapper.unmount();
	});

	it('offers to add a row in an empty table and explains an empty search', async () => {
		const empty = await mountView({ table: tableData({ rows: [], isEmptyTable: true }) });
		expect(empty.wrapper.find('[data-testid="table-add-record-in-empty-table-link"]').exists()).toBe(true);
		empty.wrapper.unmount();

		const searched = await mountView({ table: tableData({ rows: [], isEmptyTable: true }), query: '?search=zzz' });
		await searched.wrapper.find('form[role="search"]').trigger('submit');
		expect(searched.wrapper.text()).toContain('No field matches "zzz".');
		searched.wrapper.unmount();
	});
});
