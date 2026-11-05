import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { type ConcreteComponent, computed, ref } from 'vue';
import type { TableColumn, TableRowKey, TableSort } from './tableTypes';
import UiChip from './UiChip.vue';
import UiIconButton from './UiIconButton.vue';
import UiPaginator from './UiPaginator.vue';
import UiTable from './UiTable.vue';

interface Log {
	id: number;
	table: string;
	user: string;
	action: string;
	status: 'successfully' | 'unsuccessfully';
}

const ACTIONS = ['Add row', 'Edit row', 'Delete row', 'View row'];
const LOGS: Log[] = Array.from({ length: 87 }, (_, i) => ({
	id: i + 1,
	table: ['orders', 'customers', 'invoices'][i % 3] ?? 'orders',
	user: `user${(i % 7) + 1}@example.com`,
	action: ACTIONS[i % ACTIONS.length] ?? 'View row',
	status: i % 5 === 0 ? 'unsuccessfully' : 'successfully',
}));

const COLUMNS: TableColumn<Log>[] = [
	{ key: 'table', label: 'Table', sortable: true },
	{ key: 'user', label: 'User', sortable: true },
	{ key: 'action', label: 'Action' },
	{ key: 'status', label: 'Status', width: '10rem' },
];

/**
 * Native `<table>` replacing `mat-table` + `matSort` + `SelectionModel`; `UiPaginator` replaces
 * `mat-paginator`. Sorting and paging are emitted for the caller to fetch — `localSort` is opt-in.
 * Cells and headers are scoped slots (`#cell-<key>`, `#header-<key>`); `#actions` is a sticky
 * trailing column.
 */
// Widened like UiSelect's: Storybook's types cannot infer args from a generic SFC.
const meta = {
	title: 'UI/Table',
	component: UiTable as ConcreteComponent,
	subcomponents: { UiPaginator: UiPaginator as ConcreteComponent },
	tags: ['autodocs'],
	parameters: { layout: 'padded' },
	args: { columns: COLUMNS, rows: LOGS.slice(0, 8), rowKey: 'id', label: 'Audit log', loading: false, size: 'md' },
	argTypes: {
		size: { control: 'inline-radio', options: ['sm', 'md'] },
		columns: { control: false },
		rows: { control: false },
	},
	render: (args) => ({
		components: { UiTable },
		setup: () => ({ args }),
		template: '<UiTable v-bind="args" />',
	}),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = { args: { loading: true } };

export const Empty: Story = { args: { rows: [], emptyText: 'No records match this filter' } };

/**
 * The db-table-view shape: selectable rows, sorting, a custom cell, sticky actions and a paginator.
 * Sorting and paging here run in the story's own `computed`, standing in for the server.
 */
export const ServerSide: Story = {
	render: () => ({
		components: { UiTable, UiPaginator, UiChip, UiIconButton },
		setup() {
			const sort = ref<TableSort>({ active: 'table', direction: 'asc' });
			const selected = ref<TableRowKey[]>([]);
			const pageIndex = ref(0);
			const pageSize = ref(10);
			const page = computed(() => {
				const { active, direction } = sort.value;
				const sorted = [...LOGS].sort((a, b) => {
					if (!direction) return 0;
					const key = active as keyof Log;
					return (direction === 'asc' ? 1 : -1) * String(a[key]).localeCompare(String(b[key]));
				});
				return sorted.slice(pageIndex.value * pageSize.value, (pageIndex.value + 1) * pageSize.value);
			});
			const opened = ref<number | null>(null);
			return { columns: COLUMNS, sort, selected, pageIndex, pageSize, page, opened, total: LOGS.length };
		},
		template: `
      <div style="display: grid; gap: 0.5rem;">
        <UiTable
          v-model:sort="sort"
          v-model:selected="selected"
          :columns="columns"
          :rows="page"
          row-key="id"
          label="Audit log"
          selectable
          sticky-header
          interactive
          :row-class="(row) => (row.id === opened ? 'is-open' : undefined)"
          style="max-height: 24rem;"
          @row-click="(row) => (opened = row.id)"
        >
          <template #cell-status="{ value }">
            <UiChip :tone="value === 'successfully' ? 'success' : 'danger'">{{ value === 'successfully' ? 'Success' : 'Failed' }}</UiChip>
          </template>
          <template #actions="{ row }">
            <UiIconButton icon="create" :label="'Edit row ' + row.id" size="sm" />
            <UiIconButton icon="delete" :label="'Delete row ' + row.id" size="sm" />
          </template>
        </UiTable>
        <UiPaginator
          v-model:page-index="pageIndex"
          v-model:page-size="pageSize"
          :length="total"
          :page-size-options="[10, 30, 100, 300]"
          show-first-last
        />
        <code>sort: {{ JSON.stringify(sort) }} · selected: {{ JSON.stringify(selected) }} · opened: {{ opened }}</code>
      </div>
    `,
	}),
};

/** Both sizes × plain / sorted + selectable / loading / empty. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiTable },
		setup: () => ({ columns: COLUMNS, rows: LOGS.slice(0, 3), sizes: ['sm', 'md'] as const }),
		template: `
      <div style="display: grid; gap: 1.5rem;">
        <template v-for="size in sizes" :key="size">
          <UiTable :size="size" :columns="columns" :rows="rows" row-key="id" :label="size + ' plain'" />
          <UiTable :size="size" :columns="columns" :rows="rows" row-key="id" selectable :selected="[2]"
            :sort="{ active: 'user', direction: 'desc' }" :label="size + ' sorted'" />
          <UiTable :size="size" :columns="columns" :rows="rows" row-key="id" loading :label="size + ' loading'" />
          <UiTable :size="size" :columns="columns" :rows="[]" row-key="id" :label="size + ' empty'" />
        </template>
      </div>
    `,
	}),
};
