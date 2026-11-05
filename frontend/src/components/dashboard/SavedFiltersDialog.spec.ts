// Ports saved-filters-dialog.component.spec.ts as behaviour: the payloads sent for the conditions on
// screen, the quick-editing column, and validation.
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DialogHost from '@/components/dialog/DialogHost.vue';
import { mockStructure } from '@/components/fields/stories.mocks';
import { useDialog } from '@/composables/useDialog';
import { DBtype } from '@/models/connection';
import { useConnectionsStore } from '@/stores/connections';
import { type SavedFilter, useTablesStore } from '@/stores/tables';
import type { SavedFilterSet } from './SavedFiltersDialog.helpers';
import SavedFiltersDialog, { type SavedFiltersDialogData } from './SavedFiltersDialog.vue';

vi.mock('@/lib/cedar-wasm', () => ({ loadCedarWasm: () => new Promise(() => {}) }));
const analytics = vi.hoisted(() => ({ trackEvent: vi.fn(), capture: vi.fn() }));
vi.mock('@/composables/useAnalytics', () => ({ trackEvent: analytics.trackEvent }));
vi.mock('posthog-js', () => ({ default: { capture: analytics.capture } }));

const saved: SavedFilter = { id: 'new', name: 'Test Filter', filters: {} };

function dialogData(filtersSet: Partial<SavedFilterSet> = {}, extra: Partial<SavedFiltersDialogData> = {}) {
	return {
		connectionID: '123',
		tableName: 'test_table',
		displayTableName: 'Test Table',
		filtersSet: { name: 'Test Filter', filters: {}, ...filtersSet },
		structure: [],
		tableForeignKeys: {},
		tableWidgets: {},
		...extra,
	} satisfies SavedFiltersDialogData;
}

async function setup(data: SavedFiltersDialogData = dialogData()) {
	const wrapper = mount(DialogHost, { attachTo: document.body });
	const ref = useDialog().open<boolean>(SavedFiltersDialog, { data });
	await flushPromises();
	await vi.dynamicImportSettled();
	await flushPromises();
	return { wrapper, ref };
}

function button(wrapper: ReturnType<typeof mount>, label: string) {
	const match = wrapper
		.findAll('button')
		.find(
			(candidate) =>
				(candidate.find('.ui-button__label').exists() ? candidate.find('.ui-button__label') : candidate).text() ===
				label,
		);
	if (!match) throw new Error(`no button ${label}`);
	return match;
}

function quickEdit(wrapper: ReturnType<typeof mount>, field: string) {
	return wrapper.find(`[data-field="${field}"] input[role="switch"], [data-field="${field}"] [role="switch"]`);
}

async function save(wrapper: ReturnType<typeof mount>) {
	await wrapper.find('form').trigger('submit');
	await flushPromises();
}

describe('SavedFiltersDialog', () => {
	let tables: ReturnType<typeof useTablesStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		useConnectionsStore().currentConnection.type = DBtype.Postgres;
		tables = useTablesStore();
		vi.spyOn(tables, 'createSavedFilter').mockResolvedValue(saved);
		vi.spyOn(tables, 'updateSavedFilter').mockResolvedValue(saved);
		vi.spyOn(tables, 'deleteSavedFilter').mockResolvedValue({});
	});

	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('titles a new and an existing filter', async () => {
		const created = await setup();
		expect(created.wrapper.find('h2').text()).toBe('New fast filter');
		expect(created.wrapper.text()).toContain(
			'Use conditions to quickly filter test table and optionally edit one column.',
		);
		expect(created.wrapper.findAll('button').some((candidate) => candidate.text() === 'Remove')).toBe(false);
		created.ref.close();
		created.wrapper.unmount();

		const edited = await setup(dialogData({ id: 'f1' }));
		expect(edited.wrapper.find('h2').text()).toBe('Edit fast filter');
		expect(button(edited.wrapper, 'Remove').exists()).toBe(true);
	});

	it('toggles the quick-editing column', async () => {
		const { wrapper } = await setup(dialogData({ filters: { test_field: { eq: 'test_value' } } }));

		const toggle = () => quickEdit(wrapper, 'test_field');
		expect((toggle().element as HTMLInputElement).checked).toBe(false);
		await toggle().setValue(true);
		expect((toggle().element as HTMLInputElement).checked).toBe(true);
		await toggle().setValue(false);
		expect((toggle().element as HTMLInputElement).checked).toBe(false);
	});

	it('excludes the quick-editing column from filters and sends it with its comparator', async () => {
		const { wrapper, ref } = await setup(dialogData({ filters: { test_field: { eq: 'test_value' } } }));

		await quickEdit(wrapper, 'test_field').setValue(true);
		await save(wrapper);

		expect(tables.createSavedFilter).toHaveBeenCalledWith('123', 'test_table', {
			name: 'Test Filter',
			filters: {},
			dynamic_column: { column_name: 'test_field', comparator: 'eq' },
		});
		await expect(ref.afterClosed()).resolves.toBe(true);
		expect(analytics.trackEvent).toHaveBeenCalledWith('Saved filters: saved filter is created successfully');
	});

	it('keeps the other columns in filters', async () => {
		const { wrapper } = await setup(
			dialogData({ filters: { test_field: { eq: 'test_value' }, dynamic_field: { contains: 'dynamic_value' } } }),
		);

		await quickEdit(wrapper, 'dynamic_field').setValue(true);
		await save(wrapper);

		expect(tables.createSavedFilter).toHaveBeenCalledWith('123', 'test_table', {
			name: 'Test Filter',
			filters: { test_field: { eq: 'test_value' } },
			dynamic_column: { column_name: 'dynamic_field', comparator: 'contains' },
		});
	});

	it('saves empty values as null', async () => {
		const { wrapper } = await setup(dialogData({ filters: { test_field: { eq: '' } } }));

		await save(wrapper);

		expect(tables.createSavedFilter).toHaveBeenCalledWith('123', 'test_table', {
			name: 'Test Filter',
			filters: { test_field: { eq: null } },
		});
	});

	it('sends a quick-editing column without a comparator as an empty comparator', async () => {
		const { wrapper } = await setup(
			dialogData({
				filters: { test_field: { eq: 'test_value' } },
				dynamic_column: { column_name: 'dynamic_field_no_comparator', comparator: '' },
			}),
		);

		expect((quickEdit(wrapper, 'dynamic_field_no_comparator').element as HTMLInputElement).checked).toBe(true);
		await save(wrapper);

		expect(tables.createSavedFilter).toHaveBeenCalledWith('123', 'test_table', {
			name: 'Test Filter',
			filters: { test_field: { eq: 'test_value' } },
			dynamic_column: { column_name: 'dynamic_field_no_comparator', comparator: '' },
		});
	});

	it('updates an existing filter', async () => {
		const { wrapper, ref } = await setup(dialogData({ id: '123', filters: { test_field: { eq: 'test_value' } } }));

		await save(wrapper);

		expect(tables.updateSavedFilter).toHaveBeenCalledWith('123', 'test_table', '123', {
			name: 'Test Filter',
			filters: { test_field: { eq: 'test_value' } },
		});
		expect(tables.createSavedFilter).not.toHaveBeenCalled();
		await expect(ref.afterClosed()).resolves.toBe(true);
	});

	it('sends the edited name', async () => {
		const { wrapper } = await setup(dialogData({ filters: { test_field: { eq: 'x' } } }));

		await wrapper.find('input[name="filters_set_name"]').setValue('Active users');
		await save(wrapper);

		expect(tables.createSavedFilter).toHaveBeenCalledWith(
			'123',
			'test_table',
			expect.objectContaining({ name: 'Active users' }),
		);
	});

	it('requires a name', async () => {
		const { wrapper } = await setup(dialogData({ name: '   ', filters: { test_field: { eq: 'x' } } }));

		await save(wrapper);

		expect(tables.createSavedFilter).not.toHaveBeenCalled();
		expect(wrapper.text()).toContain('Fast filter name is required');
	});

	it('requires at least one condition', async () => {
		const { wrapper } = await setup();

		await save(wrapper);

		expect(tables.createSavedFilter).not.toHaveBeenCalled();
		expect(wrapper.text()).toContain('At least one condition is required');
	});

	it('stays open when saving fails', async () => {
		vi.mocked(tables.createSavedFilter).mockRejectedValue(new Error('boom'));
		const { wrapper } = await setup(dialogData({ filters: { test_field: { eq: 'x' } } }));

		await save(wrapper);

		expect(wrapper.find('form').exists()).toBe(true);
		expect(analytics.trackEvent).not.toHaveBeenCalled();
	});

	it('removes an existing filter', async () => {
		const { wrapper, ref } = await setup(dialogData({ id: 'f1' }));

		await button(wrapper, 'Remove').trigger('click');
		await flushPromises();

		expect(tables.deleteSavedFilter).toHaveBeenCalledWith('123', 'test_table', 'f1');
		await expect(ref.afterClosed()).resolves.toBe(true);
	});

	describe('with a table structure', () => {
		const structure = [
			mockStructure({ column_name: 'name', data_type: 'character varying' }),
			mockStructure({ column_name: 'age', data_type: 'integer' }),
			mockStructure({ column_name: 'active', data_type: 'boolean' }),
		];

		it('adds a condition from the column search', async () => {
			const { wrapper } = await setup(dialogData({}, { structure }));

			await button(wrapper, 'Add condition').trigger('click');
			const search = wrapper.find('input[name="filter_columns"]');
			await search.trigger('focus');
			await search.setValue('ag');
			expect(wrapper.findAll('[role="option"]').map((option) => option.text())).toEqual(['age']);
			await wrapper.find('[role="option"]').trigger('click');
			await flushPromises();
			await vi.dynamicImportSettled();
			await flushPromises();

			expect(wrapper.find('[data-field="age"]').exists()).toBe(true);
			expect(wrapper.find('input[name="filter_columns"]').exists()).toBe(false);
			await save(wrapper);
			expect(tables.createSavedFilter).toHaveBeenCalledWith('123', 'test_table', {
				name: 'Test Filter',
				filters: { age: { eq: null } },
			});
		});

		it('offers text comparators for a text column and clears the value for "is empty"', async () => {
			const { wrapper } = await setup(dialogData({ filters: { name: { startswith: 'Jo' } } }, { structure }));

			const select = wrapper.find('[data-field="name"] select');
			expect(select.findAll('option').map((option) => option.text())).toEqual([
				'starts with',
				'ends with',
				'equal',
				'contains',
				'not contains',
				'is empty',
			]);
			expect((wrapper.find('[data-field="name"] input').element as HTMLInputElement).value).toBe('Jo');
			const empty = select.findAll('option').find((option) => option.text() === 'is empty');
			await select.setValue(empty?.attributes('value'));
			await save(wrapper);

			expect(tables.createSavedFilter).toHaveBeenCalledWith('123', 'test_table', {
				name: 'Test Filter',
				filters: { name: { empty: null } },
			});
		});

		it('offers number comparators for a number column', async () => {
			const { wrapper } = await setup(dialogData({ filters: { age: { gt: 3 } } }, { structure }));

			expect(
				wrapper
					.find('[data-field="age"] select')
					.findAll('option')
					.map((option) => option.text()),
			).toEqual(['equal', 'greater than', 'less than', 'greater than or equal', 'less than or equal']);
		});

		it('lets a smart widget set its own comparator', async () => {
			const { wrapper } = await setup(dialogData({ filters: { active: { eq: true } } }, { structure }));

			expect(wrapper.find('[data-field="active"] select').exists()).toBe(false);
			await save(wrapper);
			expect(tables.createSavedFilter).toHaveBeenCalledWith('123', 'test_table', {
				name: 'Test Filter',
				filters: { active: { eq: true } },
			});
		});

		it('removes a condition', async () => {
			const { wrapper } = await setup(dialogData({ filters: { name: { eq: 'a' }, age: { eq: 1 } } }, { structure }));

			await wrapper.find('[data-field="name"] [aria-label="Remove"]').trigger('click');

			expect(wrapper.findAll('.condition-card').map((card) => card.attributes('data-field'))).toEqual(['age']);
		});
	});
});
