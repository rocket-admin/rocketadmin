<script setup lang="ts" generic="R">
/**
 * Data table on a native `<table>` — the `mat-table` + `matSort` + `SelectionModel` replacement.
 * Pair it with `UiPaginator` for `mat-paginator`.
 *
 * **Server-side first.** Clicking a sortable header only emits `update:sort`; the caller refetches.
 * Rows are never reordered locally unless `localSort` is set, which is for small, fully loaded
 * lists. Paging is likewise the caller's: pass the current page as `rows`.
 *
 * **Cells** render `row[column.key]` (or `column.value(row)`) as text by default; replace any column
 * with a scoped slot `#cell-<key>="{ row, value, index, column }"` for widgets, links, badges.
 * Headers likewise: `#header-<key>="{ column, sort, direction, setSort }"` replaces the default sort
 * button — e.g. db-table-view's sort *menu* — while `aria-sort` stays on the `<th>`.
 *
 * **Selection** (`selectable` + `v-model:selected`) holds row *keys*, from `rowKey`, so a selection
 * survives the page's rows being refetched as new objects. The header checkbox selects or clears the
 * rows on the current page and shows the indeterminate dash when only some are selected; keys of
 * rows on other pages are left alone.
 *
 * **Actions.** The `#actions="{ row, index }"` slot renders a trailing column (header
 * `actionsLabel`), sticky to the inline end by default. Clicks inside it and in the checkbox column
 * do not trigger `rowClick`.
 *
 * `rowClick` fires on a pointer click anywhere else in a row. Rows are not focusable: any action a
 * row click performs must also be reachable through a control in the row (a link or button in a
 * cell or in `actions`), as db-table-view's edit link is.
 *
 * Scrolling: the root is the scroll container (`overflow: auto`). Give it a height via `class` to
 * make `stickyHeader` stick.
 */
import { computed } from 'vue';
import type { TableColumn, TableRowKey, TableSort, TableSortDirection } from './tableTypes';
import UiCheckbox from './UiCheckbox.vue';
import UiIcon from './UiIcon.vue';
import UiSpinner from './UiSpinner.vue';

type RowClass = string | string[] | Record<string, boolean> | undefined;

const props = withDefaults(
	defineProps<{
		columns: TableColumn<R>[];
		/** The rows to show — the current page when paging server-side. */
		rows: R[];
		/** Row field (or function) giving a stable unique key. Required for `selectable`; falls back to the index. */
		rowKey?: string | ((row: R, index: number) => TableRowKey);
		/** Accessible name for the table, e.g. the table name. */
		label?: string;
		/** Dims the rows under a spinner and sets `aria-busy`. Suppresses the empty state. */
		loading?: boolean;
		/** Sorts `rows` locally by the active column. Off by default: sorting is the server's job. */
		localSort?: boolean;
		/** Lets a third header click clear the sort (asc → desc → none). Off, it toggles asc ↔ desc. */
		clearableSort?: boolean;
		/** Adds a leading checkbox column bound to `v-model:selected`. */
		selectable?: boolean;
		/** `aria-label` of the header select-all checkbox. */
		selectAllLabel?: string;
		/** `aria-label` of each row checkbox. */
		selectRowLabel?: (row: R, index: number) => string;
		/** Keeps the header row visible while the root scrolls. */
		stickyHeader?: boolean;
		/** Keeps the `actions` column visible at the inline end while scrolling sideways. */
		stickyActions?: boolean;
		/** Header text of the `actions` column. */
		actionsLabel?: string;
		/** Shown in place of rows when there are none and nothing is loading. The `empty` slot replaces it. */
		emptyText?: string;
		/** Hover affordance for rows whose click does something (`rowClick`). */
		interactive?: boolean;
		/** Extra classes per row, e.g. to highlight the row open in a side panel. */
		rowClass?: (row: R, index: number) => RowClass;
		/** Geometry only: cell padding. */
		size?: 'sm' | 'md';
	}>(),
	{
		loading: false,
		localSort: false,
		clearableSort: true,
		selectable: false,
		selectAllLabel: 'Select all rows',
		selectRowLabel: (_row: unknown, index: number) => `Select row ${index + 1}`,
		stickyHeader: false,
		stickyActions: true,
		actionsLabel: 'Actions',
		emptyText: 'No data',
		interactive: false,
		size: 'md',
	},
);

/** Current sort. Two-way via `v-model:sort`; uncontrolled when not bound. */
const sort = defineModel<TableSort>('sort', { default: () => ({ active: '', direction: '' }) });

/** Keys of the selected rows. Two-way via `v-model:selected`. */
const selected = defineModel<TableRowKey[]>('selected', { default: () => [] });

const emit = defineEmits<{ rowClick: [row: R, index: number] }>();

const slots = defineSlots<
	{
		/** Replaces the default `emptyText`. */
		empty?: () => unknown;
		/** Replaces the default spinner overlay while `loading`. */
		loading?: () => unknown;
		/** Trailing per-row actions column. */
		actions?: (props: { row: R; index: number }) => unknown;
	} & {
		[key: `cell-${string}`]:
			| ((props: { row: R; value: unknown; index: number; column: TableColumn<R> }) => unknown)
			| undefined;
	} & {
		[key: `header-${string}`]:
			| ((props: {
					column: TableColumn<R>;
					sort: TableSort;
					direction: TableSortDirection;
					setSort: (direction: TableSortDirection) => void;
			  }) => unknown)
			| undefined;
	}
>();

function cellValue(row: R, column: TableColumn<R>): unknown {
	if (column.value) return column.value(row);
	return (row as Record<string, unknown> | null)?.[column.key];
}

function keyOf(row: R, index: number): TableRowKey {
	if (typeof props.rowKey === 'function') return props.rowKey(row, index);
	if (typeof props.rowKey === 'string') {
		const key = (row as Record<string, unknown> | null)?.[props.rowKey];
		if (typeof key === 'string' || typeof key === 'number') return key;
	}
	return index;
}

/** Rows paired with their index in `rows` — the index slots and labels report, even when sorted locally. */
const displayedRows = computed(() => {
	const entries = props.rows.map((row, index) => ({ row, index, key: keyOf(row, index) }));
	const { active, direction } = sort.value;
	const column = props.columns.find((candidate) => candidate.key === active);
	if (!props.localSort || !direction || !column) return entries;
	const factor = direction === 'asc' ? 1 : -1;
	return [...entries].sort((a, b) => factor * compareValues(cellValue(a.row, column), cellValue(b.row, column)));
});

function compareValues(a: unknown, b: unknown): number {
	// Empty values first when ascending, last when descending.
	if (a == null || a === '') return b == null || b === '' ? 0 : -1;
	if (b == null || b === '') return 1;
	if (typeof a === 'number' && typeof b === 'number') return a - b;
	return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

function formatValue(value: unknown): string {
	if (value == null) return '';
	if (typeof value === 'object') return JSON.stringify(value);
	return String(value);
}

function directionOf(column: TableColumn<R>): TableSortDirection {
	return sort.value.active === column.key ? sort.value.direction : '';
}

function ariaSort(column: TableColumn<R>): 'ascending' | 'descending' | 'none' | undefined {
	if (!column.sortable) return undefined;
	const direction = directionOf(column);
	if (direction === 'asc') return 'ascending';
	if (direction === 'desc') return 'descending';
	return 'none';
}

function setSort(column: TableColumn<R>, direction: TableSortDirection) {
	sort.value = { active: direction ? column.key : '', direction };
}

/** Material's cycle: a new column starts ascending, then descending, then (if clearable) none. */
function cycleSort(column: TableColumn<R>) {
	const current = directionOf(column);
	if (current === '') setSort(column, 'asc');
	else if (current === 'asc') setSort(column, 'desc');
	else setSort(column, props.clearableSort ? '' : 'asc');
}

function sortIcon(column: TableColumn<R>): string {
	const direction = directionOf(column);
	if (direction === 'asc') return 'arrow_upward';
	if (direction === 'desc') return 'arrow_downward';
	return 'unfold_more';
}

const selectedSet = computed(() => new Set(selected.value));
const pageKeys = computed(() => displayedRows.value.map((entry) => entry.key));
const allSelected = computed(
	() => pageKeys.value.length > 0 && pageKeys.value.every((key) => selectedSet.value.has(key)),
);
const someSelected = computed(() => !allSelected.value && pageKeys.value.some((key) => selectedSet.value.has(key)));

function toggleAll() {
	const onPage = new Set(pageKeys.value);
	if (allSelected.value) {
		selected.value = selected.value.filter((key) => !onPage.has(key));
	} else {
		selected.value = [...selected.value, ...pageKeys.value.filter((key) => !selectedSet.value.has(key))];
	}
}

function toggleRow(key: TableRowKey, checked: boolean) {
	if (checked && !selectedSet.value.has(key)) selected.value = [...selected.value, key];
	else if (!checked) selected.value = selected.value.filter((candidate) => candidate !== key);
}

/** A function, not a computed: `slots` is not reactive, and presence is re-read on every render. */
function hasActions(): boolean {
	return slots.actions !== undefined;
}

function columnCount(): number {
	return props.columns.length + (props.selectable ? 1 : 0) + (hasActions() ? 1 : 0);
}

const classes = computed(() => [
	'ui-table',
	`ui-table--size-${props.size}`,
	{
		'ui-table--sticky-header': props.stickyHeader,
		'ui-table--sticky-actions': props.stickyActions,
		'ui-table--interactive': props.interactive,
		'ui-table--loading': props.loading,
	},
]);

function alignClass(column: TableColumn<R>): string {
	return `ui-table__cell--align-${column.align ?? 'start'}`;
}

function headerClasses(column: TableColumn<R>) {
	return [
		'ui-table__header-cell',
		alignClass(column),
		{ 'ui-table__header-cell--sortable': column.sortable, 'ui-table__header-cell--sorted': directionOf(column) !== '' },
	];
}

function rowClasses(entry: { row: R; index: number; key: TableRowKey }) {
	return [
		'ui-table__row',
		{ 'ui-table__row--selected': props.selectable && selectedSet.value.has(entry.key) },
		props.rowClass?.(entry.row, entry.index),
	];
}
</script>

<template>
	<div :class="classes">
		<table class="ui-table__table" :aria-label="label" :aria-busy="loading ? 'true' : undefined">
			<thead class="ui-table__head">
				<tr class="ui-table__header-row">
					<th v-if="selectable" scope="col" class="ui-table__header-cell ui-table__select-cell">
						<UiCheckbox
							:model-value="allSelected"
							:indeterminate="someSelected"
							:disabled="rows.length === 0"
							:aria-label="selectAllLabel"
							@update:model-value="toggleAll"
						/>
					</th>
					<th
						v-for="column in columns"
						:key="column.key"
						scope="col"
						:class="headerClasses(column)"
						:style="column.width ? { width: column.width } : undefined"
						:aria-sort="ariaSort(column)"
					>
						<slot
							:name="`header-${column.key}`"
							:column="column"
							:sort="sort"
							:direction="directionOf(column)"
							:set-sort="(direction: TableSortDirection) => setSort(column, direction)"
						>
							<button
								v-if="column.sortable"
								type="button"
								class="ui-table__sort"
								@click="cycleSort(column)"
							>
								<span>{{ column.label }}</span>
								<UiIcon class="ui-table__sort-icon" :name="sortIcon(column)" size="sm" />
							</button>
							<template v-else>{{ column.label }}</template>
						</slot>
					</th>
					<th v-if="hasActions()" scope="col" class="ui-table__header-cell ui-table__actions-cell">
						{{ actionsLabel }}
					</th>
				</tr>
			</thead>
			<tbody class="ui-table__body">
				<tr
					v-for="entry in displayedRows"
					:key="entry.key"
					:class="rowClasses(entry)"
					@click="emit('rowClick', entry.row, entry.index)"
				>
					<td v-if="selectable" class="ui-table__cell ui-table__select-cell" @click.stop>
						<UiCheckbox
							:model-value="selectedSet.has(entry.key)"
							:aria-label="selectRowLabel(entry.row, entry.index)"
							@update:model-value="(checked: boolean) => toggleRow(entry.key, checked)"
						/>
					</td>
					<td
						v-for="column in columns"
						:key="column.key"
						:class="['ui-table__cell', alignClass(column)]"
						:data-label="column.label"
					>
						<slot
							:name="`cell-${column.key}`"
							:row="entry.row"
							:value="cellValue(entry.row, column)"
							:index="entry.index"
							:column="column"
						>
							{{ formatValue(cellValue(entry.row, column)) }}
						</slot>
					</td>
					<td v-if="hasActions()" class="ui-table__cell ui-table__actions-cell" @click.stop>
						<div class="ui-table__actions">
							<slot name="actions" :row="entry.row" :index="entry.index" />
						</div>
					</td>
				</tr>
				<tr v-if="!loading && rows.length === 0" class="ui-table__empty-row">
					<td class="ui-table__empty" :colspan="columnCount()">
						<slot name="empty">{{ emptyText }}</slot>
					</td>
				</tr>
			</tbody>
		</table>
		<div v-if="loading" class="ui-table__loading">
			<slot name="loading"><UiSpinner size="lg" label="Loading" /></slot>
		</div>
	</div>
</template>

<style scoped>
.ui-table {
  position: relative;
  overflow: auto;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  background: var(--color-surface);
}

.ui-table__table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: var(--text-sm);
  color: var(--color-ink);
}

.ui-table__header-cell {
  font-weight: var(--weight-semibold);
  color: var(--color-ink-soft);
  text-align: start;
  white-space: nowrap;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-line);
}

.ui-table__cell {
  border-bottom: 1px solid var(--color-line);
  vertical-align: middle;
  background: var(--color-surface);
}

.ui-table__row:last-child .ui-table__cell {
  border-bottom: 0;
}

.ui-table--size-md .ui-table__header-cell,
.ui-table--size-md .ui-table__cell {
  padding: var(--space-3) var(--space-4);
}

.ui-table--size-sm .ui-table__header-cell,
.ui-table--size-sm .ui-table__cell {
  padding: var(--space-2) var(--space-3);
}

.ui-table__cell--align-start {
  text-align: start;
}

.ui-table__cell--align-center {
  text-align: center;
}

.ui-table__cell--align-end {
  text-align: end;
}

.ui-table__select-cell {
  width: 1%;
}

/* The checkbox's own focus ring needs the cell to not clip it. */
.ui-table__select-cell > :deep(.ui-checkbox) {
  display: flex;
}

.ui-table__sort {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin: calc(-1 * var(--space-1));
  padding: var(--space-1);
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.ui-table__sort:hover {
  color: var(--color-ink);
}

.ui-table__sort:focus-visible {
  outline: none;
  box-shadow: var(--ring-focus);
}

.ui-table__sort-icon {
  color: var(--color-muted-soft);
}

.ui-table__header-cell--sorted .ui-table__sort-icon {
  color: var(--color-accent);
}

.ui-table__header-cell--sorted {
  color: var(--color-ink);
}

.ui-table--sticky-header .ui-table__header-cell {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.ui-table__actions-cell {
  width: 1%;
  white-space: nowrap;
  text-align: end;
}

.ui-table__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-1);
}

.ui-table--sticky-actions .ui-table__actions-cell {
  position: sticky;
  inset-inline-end: 0;
  border-inline-start: 1px solid var(--color-line);
}

/* The corner cell sits above both sticky axes. */
.ui-table--sticky-header.ui-table--sticky-actions .ui-table__header-cell.ui-table__actions-cell {
  z-index: calc(var(--z-sticky) + 1);
}

.ui-table--interactive .ui-table__row {
  cursor: pointer;
}

.ui-table--interactive .ui-table__row:hover .ui-table__cell {
  background: var(--color-paper);
}

.ui-table__row--selected .ui-table__cell,
.ui-table--interactive .ui-table__row--selected:hover .ui-table__cell {
  background: var(--color-paper-2);
}

.ui-table__empty {
  padding: var(--space-8) var(--space-4);
  text-align: center;
  color: var(--color-muted);
}

.ui-table__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--color-surface) 65%, transparent);
  color: var(--color-accent);
}

.ui-table--loading .ui-table__table {
  min-height: var(--space-16);
}
</style>
