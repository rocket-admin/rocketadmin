import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, ref } from 'vue';
import type { TableColumn, TableRowKey, TableSort } from './tableTypes';
import UiTable from './UiTable.vue';

interface User {
	id: number;
	name: string;
	age: number | null;
}

const COLUMNS: TableColumn<User>[] = [
	{ key: 'name', label: 'Name', sortable: true },
	{ key: 'age', label: 'Age', sortable: true, align: 'end', width: '6rem' },
	{ key: 'id', label: 'ID' },
];

const ROWS: User[] = [
	{ id: 1, name: 'Charlie', age: 30 },
	{ id: 2, name: 'alice', age: null },
	{ id: 3, name: 'Bob', age: 4 },
];

function mountTable(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
	return mount(UiTable, {
		props: { columns: COLUMNS, rows: ROWS, rowKey: 'id', ...props },
		slots,
	} as Parameters<typeof mount>[1]);
}

const bodyText = (wrapper: ReturnType<typeof mountTable>, column: number) =>
	wrapper.findAll('tbody tr').map((row) => row.findAll('td')[column]?.text());

describe('UiTable', () => {
	it('renders a native table with column headers and cell values', () => {
		const wrapper = mountTable({ label: 'Users' });

		expect(wrapper.get('table').attributes('aria-label')).toBe('Users');
		// The sort icon is an aria-hidden ligature, so compare the label text only.
		const headerText = wrapper
			.findAll('th[scope="col"]')
			.map((th) => (th.find('button > span').exists() ? th.get('button > span') : th).text());
		expect(headerText).toEqual(['Name', 'Age', 'ID']);
		expect(wrapper.get('th .ui-table__sort-icon').attributes('aria-hidden')).toBe('true');
		expect(bodyText(wrapper, 0)).toEqual(['Charlie', 'alice', 'Bob']);
		expect(bodyText(wrapper, 1)).toEqual(['30', '', '4']);
	});

	it('applies column width, alignment and the cell data-label', () => {
		const wrapper = mountTable();
		const ageHeader = wrapper.findAll('th')[1]!;
		const ageCell = wrapper.findAll('tbody td')[1]!;

		expect(ageHeader.attributes('style')).toContain('width: 6rem');
		expect(ageCell.classes()).toContain('ui-table__cell--align-end');
		expect(ageCell.attributes('data-label')).toBe('Age');
	});

	it('reads values through column.value when given', () => {
		const wrapper = mountTable({
			columns: [{ key: 'x', label: 'Upper', value: (row: User) => row.name.toUpperCase() }],
		});

		expect(bodyText(wrapper, 0)).toEqual(['CHARLIE', 'ALICE', 'BOB']);
	});

	describe('sorting', () => {
		it('sets aria-sort on sortable headers only', () => {
			const wrapper = mountTable({ sort: { active: 'name', direction: 'desc' } });
			const headers = wrapper.findAll('th');

			expect(headers.map((th) => th.attributes('aria-sort'))).toEqual(['descending', 'none', undefined]);
			expect(headers[0]!.find('button').exists()).toBe(true);
			expect(headers[2]!.find('button').exists()).toBe(false);
		});

		it('cycles asc → desc → none on header clicks, emitting only', async () => {
			const Host = defineComponent({
				components: { UiTable },
				setup: () => ({ columns: COLUMNS, rows: ROWS, sort: ref<TableSort>({ active: '', direction: '' }) }),
				template: '<UiTable v-model:sort="sort" :columns="columns" :rows="rows" row-key="id" />',
			});
			const wrapper = mount(Host);
			const table = wrapper.findComponent(UiTable);
			const button = () => wrapper.findAll('th')[0]!.get('button');

			await button().trigger('click');
			expect(table.emitted('update:sort')?.at(-1)).toEqual([{ active: 'name', direction: 'asc' }]);
			await button().trigger('click');
			expect(table.emitted('update:sort')?.at(-1)).toEqual([{ active: 'name', direction: 'desc' }]);
			await button().trigger('click');
			expect(table.emitted('update:sort')?.at(-1)).toEqual([{ active: '', direction: '' }]);

			// Server-side by default: the rows were never reordered.
			expect(wrapper.findAll('tbody tr').map((row) => row.findAll('td')[0]!.text())).toEqual([
				'Charlie',
				'alice',
				'Bob',
			]);
		});

		it('toggles asc ↔ desc without clearableSort', async () => {
			const wrapper = mountTable({ clearableSort: false, sort: { active: 'name', direction: 'desc' } });
			await wrapper.findAll('th')[0]!.get('button').trigger('click');

			expect(wrapper.emitted('update:sort')?.at(-1)).toEqual([{ active: 'name', direction: 'asc' }]);
		});

		it('starts a different column ascending', async () => {
			const wrapper = mountTable({ sort: { active: 'name', direction: 'desc' } });
			await wrapper.findAll('th')[1]!.get('button').trigger('click');

			expect(wrapper.emitted('update:sort')?.at(-1)).toEqual([{ active: 'age', direction: 'asc' }]);
		});

		it('sorts locally with localSort, keeping the original index for slots', () => {
			const asc = mountTable({ localSort: true, sort: { active: 'name', direction: 'asc' } });
			expect(bodyText(asc, 0)).toEqual(['alice', 'Bob', 'Charlie']);

			const desc = mountTable({
				localSort: true,
				sort: { active: 'age', direction: 'desc' },
				selectable: true,
			});
			expect(bodyText(desc, 2)).toEqual(['30', '4', '']);
			expect(desc.findAll('tbody input').map((input) => input.attributes('aria-label'))).toEqual([
				'Select row 1',
				'Select row 3',
				'Select row 2',
			]);
		});

		it('hands header slots the sort state and a setter, keeping aria-sort', async () => {
			const wrapper = mountTable(
				{ sort: { active: 'name', direction: 'asc' } },
				{
					'header-name': `<template #header-name="{ column, direction, setSort }">
              <span class="custom">{{ column.label }} {{ direction }}</span>
              <button type="button" class="desc" @click="setSort('desc')">Desc</button>
            </template>`,
				},
			);
			const th = wrapper.findAll('th')[0]!;

			expect(th.get('.custom').text()).toBe('Name asc');
			expect(th.attributes('aria-sort')).toBe('ascending');
			await th.get('.desc').trigger('click');
			expect(wrapper.emitted('update:sort')?.at(-1)).toEqual([{ active: 'name', direction: 'desc' }]);
		});
	});

	describe('selection', () => {
		function mountSelectable(initial: TableRowKey[] = []) {
			const Host = defineComponent({
				components: { UiTable },
				setup: () => ({ columns: COLUMNS, rows: ROWS, selected: ref<TableRowKey[]>(initial) }),
				template: `
          <UiTable v-model:selected="selected" selectable :columns="columns" :rows="rows" row-key="id" />
          <output>{{ JSON.stringify(selected) }}</output>
        `,
			});
			return mount(Host);
		}
		const headerBox = (wrapper: ReturnType<typeof mount>) => wrapper.get('thead input').element as HTMLInputElement;
		const model = (wrapper: ReturnType<typeof mount>) => JSON.parse(wrapper.get('output').text()) as TableRowKey[];

		it('toggles a row key from its checkbox, labelled per row', async () => {
			const wrapper = mountSelectable();
			const boxes = wrapper.findAll('tbody input');

			expect(boxes[0]!.attributes('aria-label')).toBe('Select row 1');
			await boxes[1]!.setValue(true);
			expect(model(wrapper)).toEqual([2]);
			expect(wrapper.findAll('tbody tr')[1]!.classes()).toContain('ui-table__row--selected');

			await wrapper.findAll('tbody input')[1]!.setValue(false);
			expect(model(wrapper)).toEqual([]);
		});

		it('shows the header box indeterminate for a partial selection', () => {
			const wrapper = mountSelectable([1]);

			expect(headerBox(wrapper).indeterminate).toBe(true);
			expect(headerBox(wrapper).checked).toBe(false);
			expect(wrapper.get('thead input').attributes('aria-label')).toBe('Select all rows');
		});

		it('selects every row on the page, then clears them, leaving other pages alone', async () => {
			const wrapper = mountSelectable([99, 1]);
			await wrapper.get('thead input').setValue(true);
			expect(model(wrapper)).toEqual([99, 1, 2, 3]);
			expect(headerBox(wrapper).checked).toBe(true);
			expect(headerBox(wrapper).indeterminate).toBe(false);

			await wrapper.get('thead input').setValue(false);
			expect(model(wrapper)).toEqual([99]);
		});

		it('disables select-all on an empty table', () => {
			const wrapper = mountTable({ rows: [], selectable: true });

			expect((wrapper.get('thead input').element as HTMLInputElement).disabled).toBe(true);
		});

		it('does not emit rowClick from the checkbox cell', async () => {
			const wrapper = mountTable({ selectable: true });
			await wrapper.get('tbody td.ui-table__select-cell').trigger('click');

			expect(wrapper.emitted('rowClick')).toBeUndefined();
		});
	});

	it('emits rowClick with the row and index', async () => {
		const wrapper = mountTable({ interactive: true });
		await wrapper.findAll('tbody tr')[2]!.trigger('click');

		expect(wrapper.emitted('rowClick')?.at(-1)).toEqual([ROWS[2], 2]);
		expect(wrapper.classes()).toContain('ui-table--interactive');
	});

	it('applies rowClass per row', () => {
		const wrapper = mountTable({ rowClass: (row: User) => (row.id === 2 ? 'is-open' : undefined) });

		expect(wrapper.findAll('tbody tr').map((row) => row.classes().includes('is-open'))).toEqual([false, true, false]);
	});

	it('renders cell slots with row, value and index', () => {
		const wrapper = mountTable(
			{},
			{
				'cell-name': `<template #cell-name="{ row, value, index }"><b>{{ index }}:{{ value }}:{{ row.id }}</b></template>`,
			},
		);

		expect(wrapper.findAll('tbody b').map((b) => b.text())).toEqual(['0:Charlie:1', '1:alice:2', '2:Bob:3']);
	});

	it('renders a sticky actions column whose clicks do not emit rowClick', async () => {
		const wrapper = mountTable(
			{},
			{
				actions: `<template #actions="{ row }"><button type="button" class="edit">Edit {{ row.id }}</button></template>`,
			},
		);

		expect(wrapper.findAll('th').at(-1)!.text()).toBe('Actions');
		expect(wrapper.findAll('.edit').map((button) => button.text())).toEqual(['Edit 1', 'Edit 2', 'Edit 3']);
		expect(wrapper.classes()).toContain('ui-table--sticky-actions');
		await wrapper.get('.edit').trigger('click');
		expect(wrapper.emitted('rowClick')).toBeUndefined();
	});

	it('shows the empty state spanning every column', () => {
		const wrapper = mountTable({ rows: [], selectable: true, emptyText: 'Nothing here' });
		const cell = wrapper.get('.ui-table__empty');

		expect(cell.text()).toBe('Nothing here');
		expect(cell.attributes('colspan')).toBe('4');
	});

	it('lets the empty slot replace the empty text', () => {
		const wrapper = mountTable({ rows: [] }, { empty: () => 'No records match this filter' });

		expect(wrapper.get('.ui-table__empty').text()).toBe('No records match this filter');
	});

	it('marks itself busy while loading, without the empty state', () => {
		const wrapper = mountTable({ rows: [], loading: true });

		expect(wrapper.get('table').attributes('aria-busy')).toBe('true');
		expect(wrapper.find('.ui-table__empty').exists()).toBe(false);
		expect(wrapper.find('.ui-table__loading [role="status"]').exists()).toBe(true);
	});

	it('adds the sticky-header and size modifiers', () => {
		expect(mountTable({ stickyHeader: true, size: 'sm' }).classes()).toEqual(
			expect.arrayContaining(['ui-table--sticky-header', 'ui-table--size-sm']),
		);
	});
});
