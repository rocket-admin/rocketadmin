// Port of db-table-row-view.component.spec.ts as rendering behaviour; the value helpers it tested
// are covered in composables/useRowView.spec.ts.
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { vTooltip } from '@/components/ui';
import type { TableRow } from '@/models/table';
import { useTableStateStore } from '@/stores/table-state';
import TableRowView from './TableRowView.vue';

const tables = vi.hoisted(() => ({ fetchTable: vi.fn() }));
const notifications = vi.hoisted(() => ({ showSuccessSnackbar: vi.fn() }));
vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));
vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => ({ connection: { type: 'postgres' } }) }));
vi.mock('@/stores/notifications', () => ({ useNotificationsStore: () => notifications }));

const selectedRow: TableRow = {
	connectionID: 'conn',
	tableName: 'orders',
	record: { id: 5, title: 'Hat', user_id: { id: 42, name: 'alice' } },
	columnsOrder: ['id', 'title', 'user_id'],
	primaryKeys: { id: 5 },
	foreignKeys: {
		user_id: {
			column_name: 'user_id',
			constraint_name: 'fk',
			referenced_column_name: 'id',
			referenced_table_name: 'users',
		},
	},
	foreignKeysList: ['user_id'],
	widgets: {},
	widgetsList: [],
	fieldsTypes: { id: 'integer', title: 'text', user_id: 'foreign key' },
	relatedRecords: {
		referenced_on_column_name: 'id',
		referenced_by: [{ table_name: 'payments', column_name: 'order_id' }],
	},
	link: '/dashboard/conn/orders/entry',
};

async function mountPanel(row: TableRow | null = selectedRow) {
	const pinia = createPinia();
	setActivePinia(pinia);
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
	});
	await router.push('/dashboard/conn/orders?page_index=2&page_size=100');
	const tableState = useTableStateStore();
	if (row) tableState.selectRow(row);
	const wrapper = mount(TableRowView, {
		props: { activeFilters: { title: { eq: 'Hat' } } },
		global: { plugins: [router, pinia], directives: { tooltip: vTooltip } },
		attachTo: document.body,
	});
	await flushPromises();
	return { wrapper, router, tableState };
}

describe('TableRowView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		sessionStorage.clear();
		tables.fetchTable.mockResolvedValue({
			rows: [{ id: 1, amount: 10, order_id: 5 }],
			structure: [
				{ column_name: 'id', data_type: 'integer' },
				{ column_name: 'amount', data_type: 'integer' },
			],
			primaryColumns: [{ column_name: 'id', data_type: 'integer' }],
			foreignKeys: [],
			widgets: [],
			pagination: { total: 1, lastPage: 1, perPage: 30, currentPage: 1 },
			identity_column: null,
			list_fields: [],
		});
	});

	it('renders nothing without a selected row', async () => {
		const { wrapper } = await mountPanel(null);
		expect(wrapper.find('[data-testid="row-preview"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('lists the fields and links a foreign key to its row', async () => {
		const { wrapper } = await mountPanel();
		await vi.waitFor(() => expect(wrapper.text()).toContain('Hat'));
		const labels = wrapper.findAll('.row-view__label').map((label) => label.text());
		expect(labels).toEqual(['ID', 'Title', 'User ID']);
		const fk = wrapper.find('a.foreign-key-record-view__link');
		expect(fk.text()).toContain('alice');
		expect(fk.attributes('href')).toBe('/dashboard/conn/users/entry?id=42&mode=view');
		wrapper.unmount();
	});

	it('loads the related records and links to them', async () => {
		const { wrapper } = await mountPanel();
		expect(tables.fetchTable).toHaveBeenCalledWith(
			expect.objectContaining({ tableName: 'payments', filters: { order_id: { eq: 5 } } }),
		);
		expect(wrapper.text()).toContain('Related records');
		expect(wrapper.text()).toContain('Payments');
		const open = wrapper.find('a[aria-label="Open records in table view"]');
		expect(open.attributes('href')).toBe('/dashboard/conn/payments?filters=(order_id:(eq:5))&page_index=0');
		expect(open.attributes('target')).toBe('_blank');
		wrapper.unmount();
	});

	it('opens the record page, stashing the table view state for the way back', async () => {
		const { wrapper, tableState } = await mountPanel();
		const open = wrapper.find('a[aria-label="Open the record"]');
		expect(open.attributes('href')).toBe('/dashboard/conn/orders/entry?id=5');
		await open.trigger('click');
		expect(tableState.getBackUrlParams()).toEqual({ page_index: 2, page_size: 100 });
		expect(tableState.getBackUrlFilters()).toEqual({ title: { eq: 'Hat' } });
		expect(tableState.selectedRow).toBeNull();
		wrapper.unmount();
	});

	it('copies the link to the record', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		const { wrapper } = await mountPanel();
		await wrapper.find('button[aria-label="Copy link to this record"]').trigger('click');
		await flushPromises();
		expect(writeText).toHaveBeenCalledWith(`${location.origin}/dashboard/conn/orders/entry?id=5`);
		expect(notifications.showSuccessSnackbar).toHaveBeenCalledWith(
			'Link to this record was copied to clipboard.',
			'top',
		);
		wrapper.unmount();
	});

	it('closes', async () => {
		const { wrapper, tableState } = await mountPanel();
		await wrapper.find('button[aria-label="Close"]').trigger('click');
		expect(tableState.selectedRow).toBeNull();
		wrapper.unmount();
	});

	it('shows the skeleton while a foreign key row loads', async () => {
		const { wrapper } = await mountPanel({
			...selectedRow,
			record: null,
			columnsOrder: null,
			primaryKeys: null,
			relatedRecords: null,
			link: null,
		});
		expect(wrapper.find('[role="status"]').exists()).toBe(true);
		expect(wrapper.find('a[aria-label="Open the record"]').exists()).toBe(false);
		wrapper.unmount();
	});
});
