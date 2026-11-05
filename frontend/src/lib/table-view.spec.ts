// Ports the helper cases of db-table-view.component.spec.ts.
import { describe, expect, it } from 'vitest';
import type { TableForeignKey, TableRow } from '@/models/table';
import {
	buildSelectionCsv,
	getFilterLabel,
	getFiltersCount,
	getForeignKeyCellValue,
	getForeignKeyQueryParams,
	isForeignKeySelected,
	isRowSelected,
	moveColumn,
	sortedColumns,
	tableSwitcherGroups,
	visibleFirstTitles,
} from './table-view';

const foreignKey: TableForeignKey = {
	autocomplete_columns: ['FirstName'],
	column_name: 'CustomerId',
	column_default: undefined,
	constraint_name: 'Orders_ibfk_2',
	referenced_column_name: 'Id',
	referenced_table_name: 'Customers',
};

function selected(overrides: Partial<TableRow>): TableRow {
	return {
		connectionID: 'c',
		tableName: 'Customers',
		record: {},
		columnsOrder: [],
		primaryKeys: { Id: 42 },
		foreignKeys: {},
		foreignKeysList: [],
		widgets: {},
		widgetsList: [],
		fieldsTypes: {},
		relatedRecords: null,
		...overrides,
	};
}

describe('table-view helpers', () => {
	it('counts active filters, none while a saved filter is active', () => {
		expect(getFiltersCount({ Country: 'С', Name: 'John' }, false)).toBe(2);
		expect(getFiltersCount({ Country: 'С' }, true)).toBe(0);
		expect(getFiltersCount(null, false)).toBe(0);
	});

	it.each([
		['first_name', { startswith: 'A' }, 'First Names = A...'],
		['second_name', { endswith: 'y' }, 'Second Names = ...y'],
		['email', { contains: 'gmail' }, 'Emails = ...gmail...'],
		['email', { icontains: 'gmail' }, 'Emails != ...gmail...'],
		['email', { empty: '' }, "Emails = ' '"],
		['age', { gt: '20' }, 'Ages > 20'],
		['age', { lte: 3 }, 'Ages <= 3'],
	])('labels the %s chip %o as "%s"', (key, value, label) => {
		expect(getFilterLabel(key, value)).toBe(label);
	});

	it('returns query params for the foreign key link', () => {
		expect(getForeignKeyQueryParams(foreignKey, { Id: 42 })).toEqual({ Id: 42 });
	});

	it('shows the referenced key when no identity field was sent', () => {
		expect(getForeignKeyCellValue(foreignKey, { Id: 42 })).toBe(42);
	});

	it('shows the identity field when the API sent one', () => {
		expect(getForeignKeyCellValue(foreignKey, { Id: 42, name: 'John' })).toBe('John');
	});

	it('returns null (not throw) for an empty foreign key cell', () => {
		expect(getForeignKeyCellValue(foreignKey, null)).toBeNull();
		expect(getForeignKeyCellValue(foreignKey, undefined)).toBeNull();
	});

	it('does not throw in isForeignKeySelected when the record is null', () => {
		expect(isForeignKeySelected(null, 'foreignKey', null, foreignKey)).toBe(false);
	});

	it('marks the foreign key cell whose referenced row is open', () => {
		const row = selected({ primaryKeys: { Id: 42 }, tableName: 'Customers' });
		expect(isForeignKeySelected(row, 'foreignKey', { Id: 42 }, foreignKey)).toBe(true);
		expect(isForeignKeySelected(row, 'record', { Id: 42 }, foreignKey)).toBe(false);
		expect(isForeignKeySelected(row, 'foreignKey', { Id: 7 }, foreignKey)).toBe(false);
	});

	it('marks the row open as a record by its primary key', () => {
		const row = selected({ primaryKeys: { id: 1 } });
		expect(isRowSelected(row, 'record', { id: 1 })).toBe(true);
		expect(isRowSelected(row, 'record', { id: 2 })).toBe(false);
		expect(isRowSelected(row, 'foreignKey', { id: 1 })).toBe(false);
		expect(isRowSelected(selected({ primaryKeys: {} }), 'record', {})).toBe(false);
	});

	it('exports the selection as CSV with quoting and foreign keys by their referenced value', () => {
		const csv = buildSelectionCsv(
			[
				{ id: 1, name: 'Smith, John', note: 'say "hi"', CustomerId: { Id: 42, name: 'Ann' }, meta: { a: 1 } },
				{ id: 2, name: null, note: 'line\nbreak', CustomerId: null, meta: undefined },
			],
			['id', 'name', 'note', 'CustomerId', 'meta'],
			{ CustomerId: foreignKey },
			['CustomerId'],
		);
		expect(csv).toBe(
			['id,name,note,CustomerId,meta', '1,"Smith, John","say ""hi""",42,"{""a"":1}"', '2,,"line\nbreak",,'].join(
				'\r\n',
			),
		);
	});

	it('orders the columns menu visible first and moves a dragged column', () => {
		const columns = [
			{ title: 'a', selected: false },
			{ title: 'b', selected: true },
			{ title: 'c', selected: true },
		];
		expect(sortedColumns(columns).map((column) => column.title)).toEqual(['b', 'c', 'a']);
		// Drag "c" (position 1 in the menu) onto "b" (position 0).
		expect(moveColumn(columns, 1, 0)).toBe(true);
		expect(columns.map((column) => column.title)).toEqual(['a', 'c', 'b']);
		expect(moveColumn(columns, 0, 0)).toBe(false);
		expect(visibleFirstTitles(columns)).toEqual(['c', 'b', 'a']);
	});

	it('groups the mobile table switcher and filters it by the search', () => {
		const table = (name: string, display?: string) => ({
			table: name,
			display_name: display,
			permissions: { visibility: true, readonly: false, add: true, delete: true, edit: true },
		});
		const folders = [
			{ category_id: 'all-tables-kitten', category_name: 'All tables', tables: [table('users'), table('orders')] },
			{ category_id: 'f1', category_name: 'Sales', tables: [table('orders', 'Purchase orders')] },
		];
		expect(tableSwitcherGroups(folders, '').folders).toHaveLength(2);
		const found = tableSwitcherGroups(folders, 'purchase');
		expect(found.folders.map((folder) => folder.category_id)).toEqual(['f1']);
		expect(found.uncategorized).toEqual([]);
	});
});
