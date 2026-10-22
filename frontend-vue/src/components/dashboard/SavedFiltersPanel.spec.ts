// Ports saved-filters-panel.component.spec.ts as behaviour (selection, URL, the quick-editing column)
// and covers the reloads that followed the Angular `cast` strings.
import JsonURL from '@jsonurl/jsonurl';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { mockStructure } from '@/components/fields/stories.mocks';
import { useDialogsStore } from '@/composables/useDialog';
import { tableEvents } from '@/lib/table-events';
import { useTablesStore } from '@/stores/tables';
import SavedFiltersDialog from './SavedFiltersDialog.vue';
import {
	buildQueryParams,
	describeFilter,
	getFilterEntries,
	type ProcessedSavedFilter,
	processFiltersData,
	type SavedFilterRecord,
} from './SavedFiltersPanel.helpers';
import SavedFiltersPanel from './SavedFiltersPanel.vue';

// The panel only reads these two from the connections store.
const connections = vi.hoisted(() => ({ canEditConnection: false, currentConnection: { type: 'postgres' } }));
vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => connections }));
const analytics = vi.hoisted(() => ({ trackEvent: vi.fn(), capture: vi.fn() }));
vi.mock('@/composables/useAnalytics', () => ({ trackEvent: analytics.trackEvent }));
vi.mock('posthog-js', () => ({ default: { capture: analytics.capture } }));

const mockFilter: SavedFilterRecord = {
	id: 'filter1',
	name: 'Test Filter',
	filters: { name: { eq: 'John' }, age: { gt: 25 } },
	dynamic_column: { column_name: 'city', comparator: 'eq' },
	createdAt: '2024-02-01T00:00:00Z',
};
const olderFilter: SavedFilterRecord = {
	id: 'filter0',
	name: 'Older',
	filters: { name: { contains: 'an' } },
	createdAt: '2024-01-01T00:00:00Z',
};

const structure = [
	mockStructure({ column_name: 'name', data_type: 'character varying' }),
	mockStructure({ column_name: 'age', data_type: 'integer' }),
	mockStructure({ column_name: 'city', data_type: 'character varying' }),
];
const tableTypes = { name: 'character varying', age: 'integer', city: 'character varying' };

const blank = defineComponent({ template: '<div />' });

async function setup(query = '') {
	const router: Router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/dashboard/:connectionId/:tableName', component: blank }],
	});
	await router.push(`/dashboard/conn1/users${query}`);
	const wrapper = mount(SavedFiltersPanel, {
		attachTo: document.body,
		props: {
			connectionID: 'conn1',
			selectedTableName: 'users',
			selectedTableDisplayName: 'Users',
			structure,
			tableTypes,
			tableForeignKeys: {},
			tableWidgets: {},
		},
		global: { plugins: [router] },
	});
	await flushPromises();
	await vi.dynamicImportSettled();
	await flushPromises();
	return { wrapper, router };
}

function chip(wrapper: ReturnType<typeof mount>, name: string) {
	const match = wrapper.findAll('.saved-filters__chip-button').find((candidate) => candidate.text() === name);
	if (!match) throw new Error(`no chip ${name}`);
	return match;
}

function lastSelected(wrapper: ReturnType<typeof mount>): ProcessedSavedFilter | null | undefined {
	const emitted = wrapper.emitted('filterSelected') as [ProcessedSavedFilter | null][] | undefined;
	return emitted?.at(-1)?.[0];
}

describe('SavedFiltersPanel helpers', () => {
	it('separates the static filters from the dynamic column', () => {
		const result = processFiltersData(mockFilter);

		expect(result.dynamicColumn).toEqual({ column: 'city', operator: 'eq', value: null });
		expect(result.staticFilters.map((entry) => entry.column)).toEqual(['name', 'age']);
		expect(result.filterEntries).toEqual(getFilterEntries(mockFilter.filters));
	});

	it('takes the dynamic column value from the saved filters', () => {
		const result = processFiltersData({ ...mockFilter, filters: { ...mockFilter.filters, city: { eq: 'Paris' } } });

		expect(result.dynamicColumn?.value).toBe('Paris');
		expect(result.staticFilters.map((entry) => entry.column)).toEqual(['name', 'age']);
	});

	// The column goes through normalizeTableName, as in Angular, so it is pluralized.
	it('describes conditions as the chips show them', () => {
		expect(describeFilter({ column: 'first_name', operator: 'startswith', value: 'Jo' })).toBe('First Names = Jo...');
		expect(describeFilter({ column: 'first_name', operator: 'icontains', value: 'x' })).toBe('First Names != ...x...');
		expect(describeFilter({ column: 'age', operator: 'gte', value: 3 })).toBe('Ages >= 3');
		expect(describeFilter({ column: 'age', operator: 'empty', value: '' })).toBe("Ages = ' '");
	});

	it('keeps the page size and sort when building the query', () => {
		expect(
			buildQueryParams({ page_size: '50', sort_active: 'age', sort_direction: 'DESC', page_index: '3' }, { a: 'b' }),
		).toEqual({
			page_index: 0,
			page_size: '50',
			a: 'b',
			sort_active: 'age',
			sort_direction: 'DESC',
		});
		expect(buildQueryParams({})).toEqual({ page_index: 0, page_size: 30 });
	});
});

describe('SavedFiltersPanel', () => {
	let tables: ReturnType<typeof useTablesStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		tableEvents.all.clear();
		Object.assign(connections, { canEditConnection: false });
		tables = useTablesStore();
		vi.spyOn(tables, 'getSavedFilters').mockResolvedValue([mockFilter, olderFilter]);
		vi.spyOn(tables, 'deleteSavedFilter').mockResolvedValue({});
		vi.spyOn(tables, 'fetchTable').mockResolvedValue(null);
	});

	afterEach(() => {
		vi.useRealTimers();
		document.body.innerHTML = '';
	});

	it('loads the saved filters of the route table, oldest first', async () => {
		const { wrapper } = await setup();

		expect(tables.getSavedFilters).toHaveBeenCalledWith('conn1', 'users');
		expect(wrapper.findAll('.saved-filters__chip-button').map((button) => button.text())).toEqual([
			'Older',
			'Test Filter',
		]);
	});

	it('shows the placeholder while loading', async () => {
		vi.mocked(tables.getSavedFilters).mockReturnValue(new Promise(() => {}));
		const { wrapper } = await setup();

		expect(wrapper.find('[aria-label="Loading saved filters"]').exists()).toBe(true);
	});

	it('selects a filter: emits it and writes it to the URL', async () => {
		const { wrapper, router } = await setup('?page_size=50&sort_active=age&sort_direction=ASC');

		await chip(wrapper, 'Test Filter').trigger('click');
		await flushPromises();

		expect(lastSelected(wrapper)).toEqual(
			expect.objectContaining({ id: 'filter1', dynamicColumn: expect.objectContaining({ column: 'city' }) }),
		);
		expect(router.currentRoute.value.query).toEqual({
			page_index: '0',
			page_size: '50',
			filters: JsonURL.stringify(mockFilter.filters),
			saved_filter: 'filter1',
			dynamic_column: JsonURL.stringify({ column_name: 'city', comparator: 'eq' }),
			sort_active: 'age',
			sort_direction: 'ASC',
		});
		expect(chip(wrapper, 'Test Filter').attributes('aria-pressed')).toBe('true');
	});

	it('clears the selection when the selected filter is chosen again', async () => {
		const { wrapper, router } = await setup('?saved_filter=filter0');

		await chip(wrapper, 'Older').trigger('click');
		await flushPromises();

		expect(lastSelected(wrapper)).toBeNull();
		expect(router.currentRoute.value.query).toEqual({ page_index: '0', page_size: '30' });
	});

	it('shows the static conditions of the selected filter', async () => {
		const { wrapper } = await setup('?saved_filter=filter1');

		expect(wrapper.findAll('.saved-filters__static-chip').map((element) => element.text())).toEqual([
			'Names = John',
			'Ages > 25',
		]);
	});

	describe('the quick-editing column', () => {
		it('starts from the URL value', async () => {
			const filters = JsonURL.stringify({ ...mockFilter.filters, city: { eq: 'Paris' } });
			const dynamic = JsonURL.stringify({ column_name: 'city', comparator: 'eq' });
			const { wrapper } = await setup(`?saved_filter=filter1&filters=${filters}&dynamic_column=${dynamic}`);

			expect(wrapper.find('.dynamic-column strong').text()).toBe('city');
			expect((wrapper.find('.dynamic-column input').element as HTMLInputElement).value).toBe('Paris');
		});

		it('changes the comparator, emptying the value for "is empty"', async () => {
			const { wrapper } = await setup('?saved_filter=filter1');

			const select = wrapper.find('.dynamic-column select');
			const option = (label: string) => select.findAll('option').find((candidate) => candidate.text() === label);
			await select.setValue(option('contains')?.attributes('value'));
			expect((select.element as HTMLSelectElement).selectedOptions[0]?.text).toBe('contains');

			await select.setValue(option('is empty')?.attributes('value'));
			expect(wrapper.find('.dynamic-column input').attributes('readonly')).toBeDefined();
		});

		it('applies the typed value 800 ms after the last change', async () => {
			const { wrapper, router } = await setup('?saved_filter=filter1');
			vi.useFakeTimers();

			await wrapper.find('.dynamic-column input').setValue('Chicago');
			expect(router.currentRoute.value.query.filters).toBeUndefined();
			vi.advanceTimersByTime(800);
			vi.useRealTimers();
			await flushPromises();

			const expected = { ...mockFilter.filters, city: { eq: 'Chicago' } };
			expect(lastSelected(wrapper)).toEqual(
				expect.objectContaining({ filters: expected, dynamic_column: { column_name: 'city', comparator: 'eq' } }),
			);
			expect(router.currentRoute.value.query).toEqual(
				expect.objectContaining({
					filters: JsonURL.stringify(expected),
					dynamic_column: JsonURL.stringify({ column_name: 'city', comparator: 'eq' }),
					saved_filter: 'filter1',
				}),
			);
		});

		it('drops the column from the filters while its value is empty', async () => {
			const { wrapper, router } = await setup('?saved_filter=filter1');

			await wrapper.find('.dynamic-column input').setValue('');
			await wrapper.find('form.dynamic-column').trigger('submit');
			await flushPromises();

			expect(lastSelected(wrapper)?.filters).toEqual(mockFilter.filters);
			expect(router.currentRoute.value.query.filters).toBe(JsonURL.stringify(mockFilter.filters));
		});
	});

	describe('after the tables store announces a change', () => {
		it('reloads when a filter was created', async () => {
			await setup();
			tableEvents.emit('savedFilterCreated', { connectionID: 'conn1', tableName: 'users' });
			await flushPromises();

			expect(tables.getSavedFilters).toHaveBeenCalledTimes(2);
		});

		it('re-applies the selected filter when it was updated', async () => {
			const { wrapper, router } = await setup('?saved_filter=filter1');
			const updated = { ...mockFilter, filters: { name: { eq: 'Jane' } } };
			vi.mocked(tables.getSavedFilters).mockResolvedValue([updated, olderFilter]);

			tableEvents.emit('savedFilterUpdated', { connectionID: 'conn1', tableName: 'users', filterId: 'filter1' });
			await flushPromises();

			expect(lastSelected(wrapper)).toEqual(expect.objectContaining({ id: 'filter1', filters: updated.filters }));
			expect(router.currentRoute.value.query.filters).toBe(JsonURL.stringify(updated.filters));
		});

		it('clears the selection when a filter was deleted', async () => {
			const { wrapper, router } = await setup('?saved_filter=filter1&page_size=10');

			tableEvents.emit('savedFilterDeleted', { connectionID: 'conn1', tableName: 'users', filterId: 'filter1' });
			await flushPromises();

			expect(lastSelected(wrapper)).toBeNull();
			expect(router.currentRoute.value.query).toEqual({ page_index: '0', page_size: '10' });
			expect(tables.getSavedFilters).toHaveBeenCalledTimes(2);
		});
	});

	describe('managing filters', () => {
		it('hides the management actions from users who cannot edit the connection', async () => {
			const { wrapper } = await setup();

			expect(wrapper.find('[aria-label="Create new fast filter"]').exists()).toBe(false);
			expect(wrapper.find('[aria-label="Filter options"]').exists()).toBe(false);
		});

		it('offers the first fast filter when there is none', async () => {
			Object.assign(connections, { canEditConnection: true });
			vi.mocked(tables.getSavedFilters).mockResolvedValue([]);
			const { wrapper } = await setup();

			const create = wrapper.findAll('button').find((button) => button.text().includes('Create fast filter'));
			await create?.trigger('click');

			const [entry] = useDialogsStore().entries;
			expect(entry?.component).toBe(SavedFiltersDialog);
			expect(entry?.data).toEqual(
				expect.objectContaining({
					connectionID: 'conn1',
					tableName: 'users',
					displayTableName: 'Users',
					structure,
					filtersSet: { name: '', filters: {} },
				}),
			);
			expect(analytics.trackEvent).toHaveBeenCalledWith('Saved filters: first time setup is clicked');
		});

		it('edits and deletes a filter from its menu', async () => {
			Object.assign(connections, { canEditConnection: true });
			const { wrapper } = await setup();

			const menuItems = () => wrapper.findAll('.saved-filters__chip [role="menuitem"]');
			await menuItems()
				.filter((item) => item.text().includes('Edit'))[1]
				?.trigger('click');
			expect(useDialogsStore().entries[0]?.data).toEqual(expect.objectContaining({ filtersSet: mockFilter }));

			await menuItems()
				.filter((item) => item.text().includes('Delete'))[0]
				?.trigger('click');
			await flushPromises();
			expect(tables.deleteSavedFilter).toHaveBeenCalledWith('conn1', 'users', 'filter0');
		});

		it('exposes handleOpenSavedFiltersDialog for the table view', async () => {
			const { wrapper } = await setup();

			(wrapper.vm as unknown as { handleOpenSavedFiltersDialog: () => void }).handleOpenSavedFiltersDialog();

			expect(useDialogsStore().entries[0]?.component).toBe(SavedFiltersDialog);
		});
	});

	it('drops the selection when resetSelection turns on', async () => {
		const { wrapper } = await setup('?saved_filter=filter1');
		expect(wrapper.find('.dynamic-column').exists()).toBe(true);

		await wrapper.setProps({ resetSelection: true });

		expect(wrapper.find('.dynamic-column').exists()).toBe(false);
	});
});
