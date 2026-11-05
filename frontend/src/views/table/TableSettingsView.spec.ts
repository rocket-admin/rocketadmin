import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { type TableField, TableOrdering, type TableSettings } from '@/models/table';
import TableSettingsView from './TableSettingsView.vue';
import { buttonByText, byTestId, mountTableView } from './tableTestUtils';

const connections = vi.hoisted(() => ({ currentConnection: { title: 'Shop', database: 'shop' } }));
const tables = vi.hoisted(() => ({
	fetchTableStructure: vi.fn(),
	fetchTableSettings: vi.fn(),
	updateTableSettings: vi.fn(),
	deleteTableSettings: vi.fn(),
}));
const trackTableEvent = vi.hoisted(() => vi.fn());

vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => reactive(connections) }));
vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));
vi.mock('@/stores/notifications', () => ({ useNotificationsStore: () => reactive({ alert: null }) }));
vi.mock('@/stores/ui-settings', () => ({ useUiSettingsStore: () => reactive({ isDarkMode: false }) }));
vi.mock('@/components/table/analytics', () => ({ trackTableEvent }));

function field(column_name: string, overrides: Partial<TableField> = {}): TableField {
	return {
		column_name,
		column_default: null,
		data_type: 'varchar',
		isExcluded: false,
		isSearched: false,
		auto_increment: false,
		allow_null: true,
		character_maximum_length: null,
		...overrides,
	};
}

function settings(overrides: Partial<TableSettings> = {}): TableSettings {
	return {
		connection_id: '63f804e4-8588-4957-8d7f-655e2309fef7',
		table_name: 'actor',
		display_name: '',
		icon: '',
		search_fields: [],
		excluded_fields: [],
		list_fields: [],
		ordering: TableOrdering.Ascending,
		ordering_field: '',
		columns_view: [],
		identity_column: '',
		readonly_fields: [],
		sortable_by: [],
		autocomplete_columns: ['FirstName'],
		sensitive_fields: [],
		allow_csv_export: true,
		allow_csv_import: true,
		can_delete: true,
		...overrides,
	};
}

const PATTERN = '/dashboard/:connectionId/:tableName/settings';
const mountPage = () => mountTableView(TableSettingsView, PATTERN, '/dashboard/12345678/users/settings');

function optionTexts(wrapper: Awaited<ReturnType<typeof mountPage>>['wrapper'], name: string) {
	return wrapper.findAll(`select[name="${name}"] option`).map((option) => option.text());
}

describe('TableSettingsView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tables.fetchTableStructure.mockResolvedValue({
			structure: [field('FirstName'), field('Id', { auto_increment: true }), field('bool')],
			primaryColumns: [{ data_type: 'int', column_name: 'Id' }],
			foreignKeys: [],
			readonly_fields: [],
			table_widgets: [],
		});
		tables.fetchTableSettings.mockResolvedValue(settings());
		tables.updateTableSettings.mockResolvedValue(undefined);
		tables.deleteTableSettings.mockResolvedValue(undefined);
	});

	it('offers every column, but never a primary key as a hidden column', async () => {
		const { wrapper } = await mountPage();

		expect(tables.fetchTableSettings).toHaveBeenCalledWith('12345678', 'users');
		expect(optionTexts(wrapper, 'search_fields')).toEqual(['FirstName', 'Id', 'bool']);
		expect(optionTexts(wrapper, 'excluded_fields')).toEqual(['FirstName', 'bool']);
		expect(optionTexts(wrapper, 'identity_column')).toEqual(['None', 'FirstName', 'Id', 'bool']);
		expect(wrapper.findAll('select[name="autocomplete_columns"] option:checked').map((o) => o.text())).toEqual([
			'FirstName',
		]);
		expect(document.title).toBe('Users - Table settings | Rocketadmin');
		wrapper.unmount();
	});

	it('enables Save once something changed, then saves and goes back to the table', async () => {
		const { wrapper, router } = await mountPage();
		const save = byTestId(wrapper, 'table-settings-save-button');
		expect(save.attributes('disabled')).toBeDefined();

		await wrapper.find('input[name="display_name"]').setValue('People');
		expect(byTestId(wrapper, 'table-settings-save-button').attributes('disabled')).toBeUndefined();
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(tables.updateTableSettings).toHaveBeenCalledWith(
			true,
			'12345678',
			'users',
			expect.objectContaining({ display_name: 'People', connection_id: '12345678', table_name: 'users' }),
		);
		expect(trackTableEvent).toHaveBeenCalledWith(
			'Table settings: updated successfully',
			expect.objectContaining({
				display_name: true,
				autocomplete_columns: true,
				search_fields: false,
				list_fields: false,
			}),
		);
		expect(router.currentRoute.value.path).toBe('/dashboard/12345678/users');
		wrapper.unmount();
	});

	it('creates the settings when the table has none yet', async () => {
		tables.fetchTableSettings.mockResolvedValue({});
		const { wrapper } = await mountPage();
		expect(byTestId(wrapper, 'table-settings-reset-button').attributes('disabled')).toBeDefined();

		await wrapper.find('select[name="sortable_by"]').setValue(['0']);
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(tables.updateTableSettings).toHaveBeenCalledWith(
			false,
			'12345678',
			'users',
			expect.objectContaining({ sortable_by: ['FirstName'], allow_csv_export: true }),
		);
		wrapper.unmount();
	});

	it('resets the columns order to the table order', async () => {
		tables.fetchTableSettings.mockResolvedValue(settings({ list_fields: ['bool', 'FirstName', 'Id'] }));
		const { wrapper } = await mountPage();
		expect(wrapper.text()).toContain('bool, FirstName, Id');
		const items = () => wrapper.findAll('.table-settings__order-item').map((item) => item.text());
		expect(items()).toEqual(['drag_indicator bool', 'drag_indicator FirstName', 'drag_indicator Id']);

		await byTestId(wrapper, 'columns-order-reset-button').trigger('click');

		expect(wrapper.text()).toContain('Standard order');
		expect(items()).toEqual(['drag_indicator FirstName', 'drag_indicator Id', 'drag_indicator bool']);
		expect(byTestId(wrapper, 'table-settings-save-button').attributes('disabled')).toBeUndefined();
		wrapper.unmount();
	});

	it('deletes the settings on Reset', async () => {
		const { wrapper } = await mountPage();
		await byTestId(wrapper, 'table-settings-reset-button').trigger('click');
		await flushPromises();

		expect(tables.deleteTableSettings).toHaveBeenCalledWith('12345678', 'users');
		expect(trackTableEvent).toHaveBeenCalledWith('Table settings: reset successfully');
		wrapper.unmount();
	});

	it('goes back in history with Back', async () => {
		const { wrapper, router } = await mountPage();
		const back = vi.spyOn(router, 'back');
		await buttonByText(wrapper, 'Back').trigger('click');
		expect(back).toHaveBeenCalled();
		wrapper.unmount();
	});
});
