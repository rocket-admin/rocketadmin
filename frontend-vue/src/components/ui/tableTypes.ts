/** Types shared by `UiTable`, `UiPaginator` and their callers. */

/** `''` means unsorted — Material's `SortDirection`, so ported query-param code keeps working. */
export type TableSortDirection = 'asc' | 'desc' | '';

/** The `v-model:sort` value of a `UiTable` — Material's `Sort` state (`matSortActive`/`matSortDirection`). */
export interface TableSort {
	/** Key of the sorted column; `''` when nothing is sorted. */
	active: string;
	direction: TableSortDirection;
}

/** Identifies a row for `v-model:selected` and the `v-for` key. */
export type TableRowKey = string | number;

/** One `UiTable` column — what `matColumnDef` + `mat-header-cell` declared. */
export interface TableColumn<R = unknown> {
	/** Column id: the sort key, the `#cell-<key>`/`#header-<key>` slot suffix and, by default, the row field read. */
	key: string;
	/** Header text; also the cell's `data-label`, for a stacked mobile layout. */
	label: string;
	/** Renders the header as a sort button and sets `aria-sort`. */
	sortable?: boolean;
	/** Cell text alignment, in logical terms. Default `start`. */
	align?: 'start' | 'center' | 'end';
	/** Any CSS width for the column, e.g. `'12rem'` or `'20%'`. */
	width?: string;
	/** Reads the cell value; defaults to `row[key]`. Also what `localSort` compares. */
	value?: (row: R) => unknown;
}

/** Emitted by `UiPaginator` on every change — the shape of Material's `PageEvent`. */
export interface PageEvent {
	pageIndex: number;
	pageSize: number;
	previousPageIndex: number;
	length: number;
}
