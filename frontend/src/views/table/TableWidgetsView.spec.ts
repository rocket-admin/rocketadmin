import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import WidgetDeleteDialog from '@/components/table/WidgetDeleteDialog.vue';
import { WIDGET_DEFAULT_PARAMS } from '@/components/table/widget-defaults';
import type { TableField } from '@/models/table';
import TableWidgetsView from './TableWidgetsView.vue';
import { buttonByText, byTestId, mountTableView } from './tableTestUtils';

const connections = vi.hoisted(() => ({ currentConnection: { title: 'Shop', database: 'shop' } }));
const tables = vi.hoisted(() => ({
	fetchTableStructure: vi.fn(),
	fetchTableWidgets: vi.fn(),
	updateTableWidgets: vi.fn(),
}));
const dialog = vi.hoisted(() => ({ open: vi.fn(), result: 'delete' as string | undefined }));
const trackTableEvent = vi.hoisted(() => vi.fn());

vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => reactive(connections) }));
vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));
vi.mock('@/stores/notifications', () => ({ useNotificationsStore: () => reactive({ alert: null }) }));
vi.mock('@/components/table/analytics', () => ({ trackTableEvent }));
vi.mock('@/composables/useDialog', () => ({
	useDialog: () => ({
		open: (...args: unknown[]) => {
			dialog.open(...args);
			return { afterClosed: () => Promise.resolve(dialog.result) };
		},
	}),
}));

function field(column_name: string): TableField {
	return {
		column_name,
		column_default: null,
		data_type: 'varchar',
		isExcluded: false,
		isSearched: false,
		auto_increment: false,
		allow_null: true,
		character_maximum_length: null,
	};
}

const PATTERN = '/dashboard/:connectionId/:tableName/widgets';
const mountPage = () => mountTableView(TableWidgetsView, PATTERN, '/dashboard/12345678/users/widgets');

describe('TableWidgetsView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		dialog.result = 'delete';
		tables.fetchTableStructure.mockResolvedValue({
			structure: [field('FirstName'), field('email'), field('bool')],
			primaryColumns: [],
			foreignKeys: [],
			readonly_fields: [],
			table_widgets: [],
		});
		tables.fetchTableWidgets.mockResolvedValue([
			{ field_name: 'email', widget_type: 'Textarea', widget_params: '', name: 'user email', description: '' },
			{ field_name: 'bool', widget_type: '', widget_params: '', name: '', description: '' },
		]);
		tables.updateTableWidgets.mockResolvedValue([]);
	});

	it('loads the structure and the widgets; typeless widgets show as Default', async () => {
		const { wrapper } = await mountPage();

		expect(tables.fetchTableStructure).toHaveBeenCalledWith('12345678', 'users');
		expect(tables.fetchTableWidgets).toHaveBeenCalledWith('12345678', 'users');
		expect(byTestId(wrapper, 'widget-item-0').text()).toContain('email');
		const types = wrapper.findAll('[data-testid="widget-type-select"]');
		expect(types[1]?.find('option:checked').text()).toBe('Default');
		expect(document.title).toBe('Users - Field display | Rocketadmin');
		wrapper.unmount();
	});

	it('adds a widget for a column without one, with the type defaults', async () => {
		const { wrapper } = await mountPage();
		await byTestId(wrapper, 'widgets-add-button').trigger('click');

		const newItem = byTestId(wrapper, 'widget-item-2');
		const fieldOptions = newItem.findAll('[data-testid="widget-field-select"] option').map((option) => option.text());
		expect(fieldOptions).toEqual(['', 'FirstName']);
		expect(trackTableEvent).toHaveBeenCalledWith('Widgets: add widget is clicked');

		// Option values are option indexes; the first one is the empty placeholder.
		await newItem.find('[data-testid="widget-field-select"]').setValue('0');
		const typeSelect = byTestId(wrapper, 'widget-item-2').find('[data-testid="widget-type-select"]');
		const rangeIndex = typeSelect.findAll('option').findIndex((option) => option.text() === 'Range');
		await typeSelect.setValue(String(rangeIndex));
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(tables.updateTableWidgets).toHaveBeenCalledWith('12345678', 'users', [
			{ field_name: 'email', widget_type: 'Textarea', widget_params: '', name: 'user email', description: '' },
			{ field_name: 'bool', widget_type: '', widget_params: '', name: '', description: '' },
			{
				field_name: 'FirstName',
				widget_type: 'Range',
				widget_params: WIDGET_DEFAULT_PARAMS.Range,
				name: '',
				description: '',
			},
		]);
		wrapper.unmount();
	});

	it('saves the widgets and goes back to the table', async () => {
		const { wrapper, router } = await mountPage();
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(tables.updateTableWidgets).toHaveBeenCalledTimes(1);
		expect(trackTableEvent).toHaveBeenCalledWith('Widgets: widgets are updated successfully');
		expect(router.currentRoute.value.path).toBe('/dashboard/12345678/users');
		wrapper.unmount();
	});

	it('deletes one widget after confirmation, returns its column and saves at once', async () => {
		const { wrapper, router } = await mountPage();
		await byTestId(wrapper, 'widget-item-0').find('button[aria-label="Delete widget"]').trigger('click');
		await flushPromises();

		expect(dialog.open).toHaveBeenCalledWith(WidgetDeleteDialog, { data: 'email' });
		expect(tables.updateTableWidgets).toHaveBeenCalledWith('12345678', 'users', [
			{ field_name: 'bool', widget_type: '', widget_params: '', name: '', description: '' },
		]);
		expect(router.currentRoute.value.path).toBe('/dashboard/12345678/users/widgets');
		wrapper.unmount();
	});

	it('clears all widgets after confirmation and shows the empty state', async () => {
		const { wrapper } = await mountPage();
		await byTestId(wrapper, 'widgets-clear-all-button').trigger('click');
		await flushPromises();

		expect(dialog.open).toHaveBeenCalledWith(WidgetDeleteDialog);
		expect(tables.updateTableWidgets).toHaveBeenCalledWith('12345678', 'users', []);
		expect(wrapper.text()).toContain('Make your data easier to read and edit');
		wrapper.unmount();
	});

	it('keeps the widgets when deletion is cancelled', async () => {
		dialog.result = undefined;
		const { wrapper } = await mountPage();
		await byTestId(wrapper, 'widgets-clear-all-button').trigger('click');
		await flushPromises();

		expect(tables.updateTableWidgets).not.toHaveBeenCalled();
		expect(byTestId(wrapper, 'widget-item-1').exists()).toBe(true);
		wrapper.unmount();
	});

	it('starts from the empty state when there are no widgets', async () => {
		tables.fetchTableWidgets.mockResolvedValue([]);
		const { wrapper } = await mountPage();

		await byTestId(wrapper, 'create-first-widget-button').trigger('click');
		expect(trackTableEvent).toHaveBeenCalledWith('Widgets: add first widget is clicked');
		expect(byTestId(wrapper, 'widget-item-0').exists()).toBe(true);
		expect(buttonByText(wrapper, 'Back').attributes('href')).toBe('/dashboard/12345678/users');
		wrapper.unmount();
	});
});
