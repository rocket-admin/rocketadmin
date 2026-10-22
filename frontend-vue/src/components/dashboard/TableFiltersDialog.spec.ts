// Ports db-table-filters-dialog.component.spec.ts as behaviour: what the dialog renders for the URL,
// the table settings and the widgets, and what it closes with.
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import DialogHost from '@/components/dialog/DialogHost.vue';
import { mockStructure } from '@/components/fields/stories.mocks';
import { useDialog } from '@/composables/useDialog';
import { DBtype } from '@/models/connection';
import { useConnectionsStore } from '@/stores/connections';
import { useTablesStore } from '@/stores/tables';
import TableFiltersDialog, {
	type TableFiltersDialogData,
	type TableFiltersDialogResult,
} from './TableFiltersDialog.vue';

vi.mock('@/lib/cedar-wasm', () => ({ loadCedarWasm: () => new Promise(() => {}) }));
const analytics = vi.hoisted(() => ({ trackEvent: vi.fn(), capture: vi.fn() }));
vi.mock('@/composables/useAnalytics', () => ({ trackEvent: analytics.trackEvent }));
vi.mock('posthog-js', () => ({ default: { capture: analytics.capture } }));

const fakeFirstName = mockStructure({
	column_name: 'FirstName',
	data_type: 'varchar',
	allow_null: false,
	character_maximum_length: 30,
});
const fakeId = mockStructure({
	column_name: 'Id',
	column_default: 'auto_increment',
	data_type: 'int',
	auto_increment: true,
	allow_null: false,
});
const fakeBool = mockStructure({
	column_name: 'bool',
	data_type: 'tinyint',
	isSearched: true,
	character_maximum_length: 1,
});

function dialogData(
	overrides: Partial<TableFiltersDialogData['structure']> = {},
	extra: Partial<TableFiltersDialogData> = {},
) {
	return {
		connectionID: '12345678',
		tableName: 'users',
		displayTableName: 'Users',
		structure: {
			structure: [fakeFirstName, fakeId, fakeBool],
			foreignKeysList: ['Id'],
			foreignKeys: {
				Id: {
					referenced_column_name: 'CustomerId',
					referenced_table_name: 'Customers',
					constraint_name: 'Orders_ibfk_2',
					column_name: 'Id',
				},
			},
			widgets: [],
			...overrides,
		},
		...extra,
	} satisfies TableFiltersDialogData;
}

const blank = defineComponent({ template: '<div />' });

async function setup(query = '', data: TableFiltersDialogData = dialogData()) {
	const router: Router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/:pathMatch(.*)*', component: blank }],
	});
	await router.push(`/dashboard/12345678/users${query}`);
	const wrapper = mount(DialogHost, { attachTo: document.body, global: { plugins: [router] } });
	const ref = useDialog().open<TableFiltersDialogResult>(TableFiltersDialog, { data });
	await flushPromises();
	await vi.dynamicImportSettled();
	await flushPromises();
	return { wrapper, ref, router };
}

function lines(wrapper: ReturnType<typeof mount>) {
	return wrapper.findAll('.table-filters__line').map((line) => line.attributes('data-field'));
}

function button(wrapper: ReturnType<typeof mount>, label: string) {
	const match = wrapper.findAll('button').find((candidate) => candidate.text() === label);
	if (!match) throw new Error(`no button ${label}`);
	return match;
}

function fieldOptions(wrapper: ReturnType<typeof mount>) {
	return wrapper
		.findAll('.table-filters__select [role="option"]')
		.map((option) => ({ label: option.text(), disabled: option.attributes('aria-disabled') === 'true' }));
}

describe('TableFiltersDialog', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		useConnectionsStore().currentConnection.type = DBtype.MySQL;
		// The foreign-key filter loads the referenced row; nothing to load here.
		vi.spyOn(useTablesStore(), 'fetchTable').mockResolvedValue(null);
	});

	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('offers every column to filter by, and starts from the "searched" columns', async () => {
		const { wrapper } = await setup();

		expect(wrapper.text()).toContain('Table: Users');
		expect(fieldOptions(wrapper)).toEqual([
			{ label: 'FirstName', disabled: false },
			{ label: 'Id', disabled: false },
			{ label: 'bool', disabled: true },
		]);
		expect(lines(wrapper)).toEqual(['bool']);
	});

	it('closes with the searched columns compared with eq', async () => {
		const { wrapper, ref } = await setup();

		await wrapper.find('form').trigger('submit');

		await expect(ref.afterClosed()).resolves.toEqual({
			action: 'filter',
			filters: { bool: undefined },
			comparators: { bool: 'eq' },
		});
		expect(analytics.trackEvent).toHaveBeenCalledWith('Filters: filter is clicked');
	});

	it('starts from the URL filters', async () => {
		const { wrapper, ref } = await setup('?filters=(FirstName:(contains:nn))');

		expect(lines(wrapper)).toEqual(['FirstName']);
		expect((wrapper.find('[data-field="FirstName"] input').element as HTMLInputElement).value).toBe('nn');
		await wrapper.find('form').trigger('submit');

		await expect(ref.afterClosed()).resolves.toEqual({
			action: 'filter',
			filters: { FirstName: 'nn' },
			comparators: { FirstName: 'contains' },
		});
	});

	it('starts empty with a saved filter selected', async () => {
		const { wrapper } = await setup('?saved_filter=abc&filters=(FirstName:(eq:x))');

		expect(lines(wrapper)).toEqual([]);
		expect(button(wrapper, 'Filter').attributes('disabled')).toBeDefined();
		expect(button(wrapper, 'Reset').attributes('disabled')).toBeDefined();
	});

	it('updates the value from the widget', async () => {
		const { wrapper, ref } = await setup('?filters=(FirstName:(eq:John))');

		await wrapper.find('[data-field="FirstName"] input').setValue('new user name');
		await wrapper.find('form').trigger('submit');

		const result = await ref.afterClosed();
		expect(result?.filters).toEqual({ FirstName: 'new user name' });
	});

	it('adds a filter from the column search, defaulting to eq', async () => {
		const { wrapper, ref } = await setup('?saved_filter=abc');

		const search = wrapper.find('input[name="filter_columns"]');
		await search.trigger('focus');
		await search.setValue('first');
		expect(fieldOptions(wrapper)).toEqual([{ label: 'FirstName', disabled: false }]);
		await wrapper.find('.table-filters__select [role="option"]').trigger('click');
		await flushPromises();
		await vi.dynamicImportSettled();
		await flushPromises();

		expect(lines(wrapper)).toEqual(['FirstName']);
		expect((search.element as HTMLInputElement).value).toBe('');
		await wrapper.find('form').trigger('submit');
		await expect(ref.afterClosed()).resolves.toEqual({
			action: 'filter',
			filters: { FirstName: undefined },
			comparators: { FirstName: 'eq' },
		});
	});

	it('removes a filter line', async () => {
		const { wrapper } = await setup('?filters=(FirstName:(eq:John),bool:(eq:true))');

		await wrapper.find('[data-field="FirstName"] [aria-label="Remove"]').trigger('click');

		expect(lines(wrapper)).toEqual(['bool']);
	});

	it('resets the filters', async () => {
		const { wrapper, ref } = await setup('?filters=(FirstName:(eq:John),Id:(eq:111))');

		await button(wrapper, 'Reset').trigger('click');

		await expect(ref.afterClosed()).resolves.toEqual(expect.objectContaining({ action: 'reset', filters: {} }));
	});

	it('closes with nothing on Cancel, tracking it', async () => {
		const { wrapper, ref } = await setup();

		await button(wrapper, 'Cancel').trigger('click');

		await expect(ref.afterClosed()).resolves.toBeUndefined();
		expect(analytics.trackEvent).toHaveBeenCalledWith('Filters: cancel is clicked');
	});

	it('links to the table settings', async () => {
		const { wrapper } = await setup();

		expect(wrapper.find('a[aria-label="Advanced settings"]').attributes('href')).toBe(
			'/dashboard/12345678/users/settings',
		);
	});

	it('receives the comparator from the Email widget after it renders', async () => {
		const widgets = {
			FirstName: {
				field_name: 'FirstName',
				widget_type: 'Email',
				widget_params: '// No settings required',
				name: '',
				description: '',
			},
		};
		const { wrapper, ref } = await setup('?filters=(FirstName:(eq:a))', dialogData({ widgets }));

		expect(wrapper.find('[data-field="FirstName"] [data-testid="filter-comparator"]').exists()).toBe(true);
		await wrapper.find('form').trigger('submit');
		const result = await ref.afterClosed();
		expect(result?.comparators.FirstName).toBe('eq');
	});

	it('recognizes widgets keyed by column and uses the widget name as the label', async () => {
		const widgets = {
			FirstName: {
				field_name: 'FirstName',
				widget_type: 'Email',
				widget_params: {},
				name: 'Customer Email',
				description: '',
			},
		};
		const { wrapper } = await setup('?filters=(FirstName:(eq:a))', dialogData({ widgets }));

		expect(fieldOptions(wrapper)).toContainEqual({ label: 'Customer Email', disabled: true });
		expect(wrapper.find('[data-field="FirstName"] .table-filters__column').text()).toBe('Customer Email');
	});

	it('hides file columns from the column search', async () => {
		const widgets = { Id: { field_name: 'Id', widget_type: 'File', widget_params: {}, name: '', description: '' } };
		const { wrapper } = await setup('', dialogData({ widgets }));

		expect(fieldOptions(wrapper).map((option) => option.label)).toEqual(['FirstName', 'bool']);
	});

	it('adds the autofocus column', async () => {
		const { wrapper, ref } = await setup('?filters=(FirstName:(eq:John))', dialogData({}, { autofocusField: 'Id' }));

		expect(lines(wrapper)).toEqual(['FirstName', 'Id']);
		await wrapper.find('form').trigger('submit');
		const result = await ref.afterClosed();
		expect(result?.comparators.Id).toBe('eq');
	});
});
