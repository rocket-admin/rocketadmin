import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h, reactive } from 'vue';
import { createMemoryHistory, createRouter, type Router, RouterView } from 'vue-router';
import type { TableField } from '@/models/table';
import RowEditView from './RowEditView.vue';

const connections = vi.hoisted(() => ({
	currentConnection: { type: 'postgres', isTestConnection: false },
	/** Read by the side row view (TableRowView). */
	connection: { type: 'postgres' },
	currentConnectionID: 'conn-1',
}));
const tables = vi.hoisted(() => ({
	fetchTableStructure: vi.fn(),
	fetchTable: vi.fn(),
	activateActions: vi.fn(),
	currentTableName: 'orders',
}));
const tableRow = vi.hoisted(() => ({
	fetchTableRow: vi.fn(),
	addTableRow: vi.fn(),
	updateTableRow: vi.fn(),
}));
const tableState = vi.hoisted(() => ({
	getBackUrlFilters: vi.fn(() => null),
	getBackUrlParams: vi.fn(() => null),
	selectRow: vi.fn(),
	clearSelection: vi.fn(),
	selectedRow: null as Record<string, unknown> | null,
}));
const notifications = vi.hoisted(() => ({ alert: null, dismissAlert: vi.fn() }));
const permissions = vi.hoisted(() => ({ allowed: true }));
const dialog = vi.hoisted(() => ({ open: vi.fn() }));

vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => reactive(connections) }));
vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));
vi.mock('@/stores/table-row', () => ({ useTableRowStore: () => tableRow }));
vi.mock('@/stores/table-state', () => ({ useTableStateStore: () => tableState }));
vi.mock('@/stores/notifications', () => ({ useNotificationsStore: () => reactive(notifications) }));
vi.mock('@/stores/cedar-permissions', () => ({
	useCedarPermissionsStore: () => ({ canI: () => computed(() => permissions.allowed) }),
}));
vi.mock('@/composables/useDialog', () => ({
	useDialog: () => ({
		open: (...args: unknown[]) => {
			dialog.open(...args);
			return { afterClosed: () => Promise.resolve(undefined) };
		},
	}),
}));

function field(column_name: string, overrides: Partial<TableField> = {}): TableField {
	return {
		column_name,
		column_default: null,
		data_type: 'character varying',
		isExcluded: false,
		isSearched: false,
		auto_increment: false,
		allow_null: true,
		character_maximum_length: null,
		...overrides,
	};
}

const structure = [field('id', { data_type: 'integer', auto_increment: true }), field('name'), field('note')];

function structureResponse() {
	return {
		structure,
		primaryColumns: [{ column_name: 'id', data_type: 'integer' }],
		foreignKeys: [],
		readonly_fields: [],
		table_widgets: [
			{ field_name: 'note', widget_type: 'Textarea', widget_params: '', name: 'Notes', description: 'Free text' },
		],
		excluded_fields: [],
		list_fields: [],
	};
}

function rowResponse(overrides: Record<string, unknown> = {}) {
	return {
		row: { id: 42, name: 'order-42', note: 'hello' },
		structure,
		primaryColumns: [{ column_name: 'id', data_type: 'integer' }],
		foreignKeys: [],
		table_widgets: [],
		readonly_fields: [],
		list_fields: [],
		can_delete: true,
		table_actions: [
			{ id: 'a1', title: 'Ping', icon: 'bolt', require_confirmation: false, event: 'CUSTOM', type: 'single' },
		],
		...overrides,
	};
}

async function mountPage(url: string): Promise<{ wrapper: VueWrapper; router: Router }> {
	const pinia = createPinia();
	setActivePinia(pinia);
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/dashboard/:connectionId/:tableName/entry', component: RowEditView },
			{ path: '/:pathMatch(.*)*', component: { render: () => h('div', 'elsewhere') } },
		],
	});
	router.push(url);
	await router.isReady();
	const Host = defineComponent({ render: () => h(RouterView) });
	const wrapper = mount(Host, { global: { plugins: [router, pinia] }, attachTo: document.body });
	await settle();
	return { wrapper, router };
}

/** Lets the lazily imported field widgets resolve and render. */
async function settle() {
	await flushPromises();
	await vi.dynamicImportSettled();
	await flushPromises();
}

function byTestId(wrapper: VueWrapper, id: string) {
	return wrapper.find(`[data-testid="${id}"]`);
}

describe('RowEditView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		permissions.allowed = true;
		tableState.selectedRow = null;
		connections.currentConnection = { type: 'postgres', isTestConnection: false };
		tables.fetchTableStructure.mockResolvedValue(structureResponse());
		tableRow.fetchTableRow.mockResolvedValue(rowResponse());
		tableRow.addTableRow.mockResolvedValue({ row: { id: 7 }, primaryColumns: [{ column_name: 'id' }] });
		tableRow.updateTableRow.mockResolvedValue({ row: { id: 42 }, primaryColumns: [{ column_name: 'id' }] });
	});

	it('adds a row: renders a widget per settable column and submits the values', async () => {
		const { wrapper, router } = await mountPage('/dashboard/conn-1/orders/entry');

		expect(wrapper.find('h1').text()).toBe('Add row');
		expect(byTestId(wrapper, 'record-field-id').exists()).toBe(false);
		expect(byTestId(wrapper, 'record-field-name').find('input').exists()).toBe(true);
		// The table widget picks the component (Textarea) and its name labels it.
		expect(byTestId(wrapper, 'record-field-note').find('textarea').exists()).toBe(true);
		expect(byTestId(wrapper, 'record-field-note').text()).toContain('Notes');
		expect(byTestId(wrapper, 'record-edit-button').exists()).toBe(false);

		await byTestId(wrapper, 'record-field-name').find('input').setValue('new order');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(tableRow.addTableRow).toHaveBeenCalledWith(
			'conn-1',
			'orders',
			expect.objectContaining({ name: 'new order' }),
		);
		expect(router.currentRoute.value.path).toBe('/dashboard/conn-1/orders');
		wrapper.unmount();
	});

	it('edits a row: Save, duplicate, delete and the custom actions', async () => {
		const { wrapper } = await mountPage('/dashboard/conn-1/orders/entry?id=42');

		expect(tableRow.fetchTableRow).toHaveBeenCalledWith('conn-1', 'orders', { id: '42' });
		expect(wrapper.find('h1').text()).toBe('Edit row');
		expect(byTestId(wrapper, 'record-edit-button').exists()).toBe(true);
		expect(byTestId(wrapper, 'record-add-button').exists()).toBe(false);
		expect(byTestId(wrapper, 'record-duplicate-link').attributes('href')).toBe(
			'/dashboard/conn-1/orders/entry?id=42&action=dub',
		);

		await byTestId(wrapper, 'record-field-name').find('input').setValue('renamed');
		await byTestId(wrapper, 'record-save-and-continue-editing-button').trigger('click');
		await flushPromises();
		expect(tableRow.updateTableRow).toHaveBeenCalledWith('conn-1', 'orders', { id: '42' }, { name: 'renamed' });

		await byTestId(wrapper, 'record-delete-button').trigger('click');
		expect(dialog.open).toHaveBeenCalledTimes(1);

		const ping = wrapper.findAll('button').find((button) => button.attributes('aria-label') === 'Ping');
		await ping?.trigger('click');
		expect(tables.activateActions).toHaveBeenCalledWith('conn-1', 'orders', 'a1', 'Ping', [{ id: '42' }]);
		wrapper.unmount();
	});

	it('hides delete when the table settings forbid it, and editing without the permission', async () => {
		permissions.allowed = false;
		tableRow.fetchTableRow.mockResolvedValue(rowResponse({ can_delete: false }));
		const { wrapper } = await mountPage('/dashboard/conn-1/orders/entry?id=42');

		expect(byTestId(wrapper, 'record-delete-button').exists()).toBe(false);
		expect(byTestId(wrapper, 'record-duplicate-link').exists()).toBe(false);
		expect(byTestId(wrapper, 'record-edit-button').exists()).toBe(false);
		expect(byTestId(wrapper, 'record-save-and-continue-editing-button').exists()).toBe(false);
		wrapper.unmount();
	});

	it('view mode offers Edit, which drops the mode from the URL', async () => {
		const { wrapper, router } = await mountPage('/dashboard/conn-1/orders/entry?id=42&mode=view');

		expect(wrapper.find('h1').text()).toBe('View row');
		expect(byTestId(wrapper, 'record-edit-button').exists()).toBe(false);
		await byTestId(wrapper, 'switch-to-editing-button').trigger('click');
		await flushPromises();

		expect(router.currentRoute.value.fullPath).toBe('/dashboard/conn-1/orders/entry?id=42');
		expect(wrapper.find('h1').text()).toBe('Edit row');
		wrapper.unmount();
	});

	it('shows the server error with a way back to the table', async () => {
		tableRow.fetchTableRow.mockRejectedValue(new Error('Row not found'));
		const { wrapper } = await mountPage('/dashboard/conn-1/orders/entry?id=1');

		expect(wrapper.text()).toContain('Row not found');
		const back = wrapper.findAll('a').find((link) => link.text() === 'Dashboard');
		expect(back?.attributes('href')).toBe('/dashboard/conn-1/orders');
		expect(wrapper.find('form').exists()).toBe(false);
		wrapper.unmount();
	});

	it('warns on a test connection', async () => {
		connections.currentConnection = { type: 'postgres', isTestConnection: true };
		const { wrapper } = await mountPage('/dashboard/conn-1/orders/entry');
		expect(wrapper.text()).toContain('This is a TEST DATABASE, public to all.');
		wrapper.unmount();
	});

	it('lists the related records, marking an empty table', async () => {
		tableRow.fetchTableRow.mockResolvedValueOnce(
			rowResponse({
				referenced_table_names_and_columns: [
					{ referenced_on_column_name: 'id', referenced_by: [{ table_name: 'order_items', column_name: 'order_id' }] },
				],
			}),
		);
		tables.fetchTable.mockResolvedValue({
			rows: [],
			structure: [field('item_id')],
			primaryColumns: [{ column_name: 'item_id', data_type: 'integer' }],
			foreignKeys: [],
			widgets: [],
			list_fields: [],
		});
		const { wrapper } = await mountPage('/dashboard/conn-1/orders/entry?id=42');

		expect(wrapper.text()).toContain('Records related to');
		expect(wrapper.text()).toContain('Order Items');
		expect(wrapper.text()).toContain('Empty');
		const open = wrapper.findAll('a').find((link) => link.attributes('aria-label') === 'Open records in table view');
		expect(open?.attributes('href')).toContain('/dashboard/conn-1/order_items?filters=');
		wrapper.unmount();
	});

	it('shows a related record in the side row view, narrowing the form beside it', async () => {
		tableState.selectedRow = {
			connectionID: 'conn-1',
			tableName: 'order_items',
			record: { item_id: 3 },
			columnsOrder: ['item_id'],
			primaryKeys: { item_id: 3 },
			foreignKeys: {},
			foreignKeysList: [],
			widgets: {},
			widgetsList: [],
			fieldsTypes: { item_id: 'integer' },
			relatedRecords: null,
			link: '/dashboard/conn-1/order_items/entry',
		};
		const { wrapper } = await mountPage('/dashboard/conn-1/orders/entry?id=42');

		expect(wrapper.find('[data-testid="row-preview"]').exists()).toBe(true);
		expect(wrapper.find('.row-edit__wrapper').classes()).toContain('row-edit__wrapper--shifted');
		wrapper.unmount();
	});
});
