// The pure logic of db-table-view (DbTableViewComponent), pulled out of the component so it is
// tested on its own: filter chip labels, foreign-key cells, the selected-row highlight, CSV export
// of the selection, the columns menu order and the mobile table switcher's search.
import { normalizeTableName } from '@/lib/normalize';
import type { TableForeignKey, TableProperties, TableRow } from '@/models/table';

export interface TableCategoryView {
	category_id: string | null;
	category_name: string;
	category_color?: string;
	tables: TableProperties[];
}

export const DISPLAYED_COMPARATORS: Record<string, string> = {
	eq: '=',
	gt: '>',
	lt: '<',
	gte: '>=',
	lte: '<=',
};

/** The number of filter chips; none while a saved filter is active (it shows its own UI). */
export function getFiltersCount(activeFilters: object | null | undefined, hasSavedFilterActive: boolean): number {
	if (activeFilters && !hasSavedFilterActive) return Object.keys(activeFilters).length;
	return 0;
}

/** The chip text of one active filter, e.g. `First Names = A...`. */
export function getFilterLabel(key: string, value: Record<string, unknown>): string {
	const displayedName = normalizeTableName(key);
	const comparator = Object.keys(value)[0] ?? '';
	const filterValue = Object.values(value)[0];
	if (comparator === 'startswith') return `${displayedName} = ${filterValue}...`;
	if (comparator === 'endswith') return `${displayedName} = ...${filterValue}`;
	if (comparator === 'contains') return `${displayedName} = ...${filterValue}...`;
	if (comparator === 'icontains') return `${displayedName} != ...${filterValue}...`;
	if (comparator === 'empty') return `${displayedName} = ' '`;
	return `${displayedName} ${DISPLAYED_COMPARATORS[comparator]} ${filterValue}`;
}

type Cell = Record<string, unknown> | null | undefined;

/** What a foreign-key cell shows: the identity column when the API sent one, else the key. */
export function getForeignKeyCellValue(foreignKey: TableForeignKey, cell: Cell): unknown {
	if (cell == null) return null;
	const identityColumnName = Object.keys(cell).find((key) => key !== foreignKey.referenced_column_name);
	if (identityColumnName) return cell[identityColumnName];
	return cell[foreignKey.referenced_column_name];
}

export function getForeignKeyQueryParams(foreignKey: TableForeignKey, cell: Record<string, unknown>) {
	return { [foreignKey.referenced_column_name]: cell[foreignKey.referenced_column_name] };
}

export type SelectedRowType = 'record' | 'foreignKey';

/** The row whose primary key is open in the side panel (as a record, not a foreign key). */
export function isRowSelected(
	selectedRow: TableRow | null,
	selectedRowType: SelectedRowType,
	primaryKeys: Record<string, unknown>,
): boolean {
	if (selectedRowType === 'record' && selectedRow && selectedRow.primaryKeys !== null) {
		return (
			Object.keys(selectedRow.primaryKeys).length > 0 &&
			JSON.stringify(selectedRow.primaryKeys) === JSON.stringify(primaryKeys)
		);
	}
	return false;
}

/** The foreign-key cell whose referenced row is open in the side panel. */
export function isForeignKeySelected(
	selectedRow: TableRow | null,
	selectedRowType: SelectedRowType,
	record: Cell,
	foreignKey: TableForeignKey,
): boolean {
	if (record == null) return false;
	const primaryKeyValue = record[foreignKey.referenced_column_name];
	if (selectedRowType === 'foreignKey' && selectedRow && selectedRow.record !== null) {
		return (
			Object.values(selectedRow.primaryKeys ?? {})[0] === primaryKeyValue &&
			selectedRow.tableName === foreignKey.referenced_table_name
		);
	}
	return false;
}

function toCsvValue(input: unknown): string {
	if (input === null || input === undefined) return '';
	let value = input;
	if (typeof value === 'object') {
		try {
			value = JSON.stringify(value);
		} catch {
			value = '[Object]';
		}
	}
	const stringValue = String(value);
	if (/[",\n\r]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
	return stringValue;
}

/**
 * The selected rows as CSV (header row first, CRLF line ends), in the displayed column order; a
 * foreign-key cell exports its referenced value.
 */
export function buildSelectionCsv(
	rows: Record<string, unknown>[],
	columns: string[],
	foreignKeys: Record<string, TableForeignKey>,
	foreignKeysList: string[],
): string {
	const lines = rows.map((row) =>
		columns
			.map((fieldName) => {
				let value = row[fieldName];
				if (foreignKeysList.includes(fieldName) && value && typeof value === 'object') {
					const foreignKey = foreignKeys[fieldName];
					if (foreignKey) value = (value as Record<string, unknown>)[foreignKey.referenced_column_name];
				}
				return toCsvValue(value);
			})
			.join(','),
	);
	lines.unshift(columns.map((header) => toCsvValue(header)).join(','));
	return lines.join('\r\n');
}

/** Saves `csv` as `myFile.csv`, as the Angular export did. */
export function downloadCsv(csv: string, fileName = 'myFile.csv'): void {
	const a = document.createElement('a');
	const blob = new Blob([csv], { type: 'text/csv' });
	const url = window.URL.createObjectURL(blob);
	a.href = url;
	a.download = fileName;
	a.click();
	window.URL.revokeObjectURL(url);
	a.remove();
}

/** The columns menu order: visible columns first, then hidden ones, each group in table order. */
export function sortedColumns<C extends { selected: boolean }>(columns: C[]): C[] {
	return [...columns].sort((a, b) => {
		if (a.selected === b.selected) return 0;
		return a.selected ? -1 : 1;
	});
}

/**
 * Moves a column dragged in the (visible-first) menu: indices are positions in `sortedColumns`,
 * mapped back to the columns array, which is reordered in place. False when nothing moved.
 */
export function moveColumn<C extends { title: string; selected: boolean }>(
	columns: C[],
	previousIndex: number,
	currentIndex: number,
): boolean {
	if (previousIndex === currentIndex) return false;
	const sorted = sortedColumns(columns);
	const dragged = sorted[previousIndex];
	const target = sorted[currentIndex];
	if (!dragged || !target) return false;
	const from = columns.findIndex((column) => column.title === dragged.title);
	const to = columns.findIndex((column) => column.title === target.title);
	if (from === -1 || to === -1) return false;
	const [moved] = columns.splice(from, 1);
	if (moved) columns.splice(to, 0, moved);
	return true;
}

/** The ordering the personal view settings store: visible columns first, then the hidden ones. */
export function visibleFirstTitles(columns: { title: string; selected: boolean }[]): string[] {
	return [...columns.filter((column) => column.selected), ...columns.filter((column) => !column.selected)].map(
		(column) => column.title,
	);
}

export function matchesTableQuery(table: TableProperties, query: string): boolean {
	const haystack = [table.normalizedTableName, table.display_name, table.table].filter(Boolean).join(' ').toLowerCase();
	return haystack.includes(query);
}

/**
 * The mobile table switcher's groups. As in Angular, "all tables" is the folder with a null id,
 * and every folder with an id is listed as a group (the API's "All tables" folder included).
 */
export function tableSwitcherGroups(tableFolders: TableCategoryView[] | null | undefined, search: string) {
	const folders = (tableFolders ?? []).filter((category) => category.category_id !== null);
	const allTables = (tableFolders ?? []).find((category) => category.category_id === null)?.tables ?? [];
	const inFolders = new Set<string>();
	for (const folder of folders) for (const table of folder.tables ?? []) inFolders.add(table.table);
	const uncategorized = allTables.filter((table) => !inFolders.has(table.table));

	const query = search.trim().toLowerCase();
	if (!query) return { folders, uncategorized };
	return {
		folders: folders
			.map((folder) => ({
				...folder,
				tables: (folder.tables ?? []).filter((table) => matchesTableQuery(table, query)),
			}))
			.filter((folder) => folder.tables.length > 0),
		uncategorized: uncategorized.filter((table) => matchesTableQuery(table, query)),
	};
}
