// Port of the TablesDataSource behaviour: what one rows response turns into.
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TableField } from '@/models/table';
import { type TableRowsFullResponse, useTableData } from './useTableData';

const tables = vi.hoisted(() => ({ fetchTable: vi.fn() }));
const tableRow = vi.hoisted(() => ({ fetchTableRow: vi.fn() }));
vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));
vi.mock('@/stores/table-row', () => ({ useTableRowStore: () => tableRow }));

function field(column_name: string, data_type = 'varchar', extra: Partial<TableField> = {}): TableField {
	return {
		column_name,
		column_default: null,
		data_type,
		isExcluded: false,
		isSearched: false,
		allow_null: true,
		auto_increment: false,
		character_maximum_length: null,
		...extra,
	};
}

function response(overrides: Partial<TableRowsFullResponse> = {}): TableRowsFullResponse {
	return {
		rows: [
			{ id: 1, name: 'Ann', active: 1, owner_id: { id: 7, email: 'eric@park.com' } },
			{ id: 2, name: 'Bob', active: 0, owner_id: { id: 8, email: 'kyle@park.com' } },
		],
		structure: [
			field('id', 'integer'),
			field('name'),
			field('active', 'tinyint', { character_maximum_length: 1 }),
			field('owner_id', 'integer'),
		],
		primaryColumns: [{ column_name: 'id', data_type: 'integer' }],
		foreignKeys: [
			{ column_name: 'owner_id', constraint_name: 'fk', referenced_column_name: 'id', referenced_table_name: 'users' },
		],
		widgets: [
			{
				field_name: 'name',
				widget_type: 'String',
				widget_params: '{ maxLength: 10 }',
				name: 'Full name',
				description: '',
			},
		],
		pagination: { total: 42, lastPage: 2, perPage: 30, currentPage: 1 },
		identity_column: 'name',
		action_events: [
			{ id: 'a1', event: 'CUSTOM', title: 'Ping', type: 'single', icon: 'bolt', require_confirmation: false },
			{ id: 'a2', event: 'CUSTOM', title: 'Mail all', type: 'multiple', icon: 'mail', require_confirmation: true },
		] as TableRowsFullResponse['action_events'],
		table_settings: { list_fields: [], columns_view: [], ordering_field: 'name', ordering: 'DESC' },
		columns_view: [],
		allow_csv_export: true,
		allow_csv_import: false,
		can_delete: true,
		sortable_by: ['name'],
		configured: true,
		large_dataset: false,
		...overrides,
	};
}

const params = { connectionID: 'conn', tableName: 'customers', requstedPage: 0, pageSize: 30 };

describe('useTableData', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tableRow.fetchTableRow.mockResolvedValue({
			referenced_table_names_and_columns: [{ referenced_on_column_name: 'id', referenced_by: [] }],
		});
	});

	it('requests the 1-based page with the sort, filters and search', async () => {
		tables.fetchTable.mockResolvedValue(response());
		const data = useTableData();
		await data.fetchRows({
			...params,
			requstedPage: 2,
			pageSize: 100,
			sortColumn: 'name',
			sortOrder: 'ASC',
			filters: { name: { eq: 'Ann' } },
			search: 'an',
			uncached: true,
		});
		expect(tables.fetchTable).toHaveBeenCalledWith({
			connectionID: 'conn',
			tableName: 'customers',
			requstedPage: 3,
			chunkSize: 100,
			sortColumn: 'name',
			sortOrder: 'ASC',
			filters: { name: { eq: 'Ann' } },
			comparators: undefined,
			search: 'an',
			uncached: true,
		});
	});

	it('formats rows, keys foreign keys and widgets, and derives the table types', async () => {
		tables.fetchTable.mockResolvedValue(response());
		const data = useTableData();
		await data.fetchRows(params);

		expect(data.loading).toBe(false);
		expect(data.rows[0]).toEqual({ id: 1, name: 'Ann', active: true, owner_id: { id: 7, email: 'eric@park.com' } });
		expect(data.isEmptyTable).toBe(false);
		expect(data.foreignKeysList).toEqual(['owner_id']);
		expect(data.foreignKeys.owner_id?.referenced_table_name).toBe('users');
		expect(data.widgetsList).toEqual(['name']);
		expect(data.widgets.name?.widget_params).toEqual({ maxLength: 10 });
		expect(data.tableTypes).toEqual({ id: 'integer', name: 'varchar', active: 'boolean', owner_id: 'foreign key' });
		expect(data.identityColumn).toBe('name');
		expect(data.tableBulkActions.map((action) => action.title)).toEqual(['Mail all']);
		expect(data.isExportAllowed).toBe(true);
		expect(data.isImportAllowed).toBe(false);
		expect(data.canDelete).toBe(true);
		expect(data.sortByColumns).toEqual(['name']);
		expect(data.defaultSort).toEqual({ column: 'name', direction: 'desc' });
		expect(data.total).toBe(42);
		expect(data.pageSize).toBe(30);
	});

	it('loads the related records of the first row by its primary key', async () => {
		tables.fetchTable.mockResolvedValue(response());
		const data = useTableData();
		await data.fetchRows(params);
		await flushPromises();
		expect(tableRow.fetchTableRow).toHaveBeenCalledWith('conn', 'customers', { id: 1 });
		expect(data.relatedRecords).toEqual({ referenced_on_column_name: 'id', referenced_by: [] });
	});

	it('shows the first six columns by default, with widget names', async () => {
		const structure = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((name) => field(name));
		tables.fetchTable.mockResolvedValue(response({ rows: [], structure, widgets: [], foreignKeys: [] }));
		const data = useTableData();
		await data.fetchRows(params);
		expect(data.dataColumns).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
		expect(data.displayedDataColumns).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
		expect(data.displayedColumns).toEqual(['select', 'a', 'b', 'c', 'd', 'e', 'f', 'actions']);
		expect(data.isEmptyTable).toBe(true);
	});

	it('orders columns by list_fields, shows columns_view and skips excluded columns', async () => {
		tables.fetchTable.mockResolvedValue(
			response({
				structure: [
					field('id', 'integer'),
					field('name'),
					field('secret', 'varchar', { isExcluded: true }),
					field('active'),
				],
				table_settings: { list_fields: ['name', 'active', 'id', 'secret'], columns_view: ['name', 'id'] },
			}),
		);
		const data = useTableData();
		await data.fetchRows(params);
		expect(data.dataColumns).toEqual(['name', 'active', 'id']);
		expect(data.displayedDataColumns).toEqual(['name', 'id']);
		expect(data.dataNormalizedColumns).toEqual({ name: 'Full name', active: 'Active', id: 'ID' });
		expect(data.defaultSort).toBeNull();
	});

	it('keeps the columns on paging and sorting', async () => {
		tables.fetchTable.mockResolvedValue(response());
		const data = useTableData();
		await data.fetchRows(params);
		const first = data.columns[0];
		if (first) first.selected = false;
		await data.fetchRows({ ...params, isTablePageSwitched: true });
		expect(data.columns[0]?.selected).toBe(false);
	});

	it('warns about tables without a primary key and about unconfigured tables', async () => {
		tables.fetchTable.mockResolvedValue(response({ primaryColumns: [], widgets: [], configured: false }));
		const data = useTableData();
		await data.fetchRows(params);
		expect(data.displayedColumns).not.toContain('select');
		expect(data.alert_primaryKeysInfo?.message).toBe(
			'Add primary keys through your database to be able to work with the table rows.',
		);
		expect(data.alert_settingsInfo?.actions?.[0]?.to).toBe('/auto-configure/conn');
	});

	it('builds row query params, a foreign key primary key by its referenced value, "dub" for duplicates', async () => {
		tables.fetchTable.mockResolvedValue(
			response({
				primaryColumns: [
					{ column_name: 'id', data_type: 'integer' },
					{ column_name: 'owner_id', data_type: 'integer' },
				],
			}),
		);
		const data = useTableData();
		await data.fetchRows(params);
		const row = { id: 1, owner_id: { id: 7, email: 'eric@park.com' } };
		expect(data.getQueryParams(row)).toEqual({ id: 1, owner_id: 7 });
		expect(data.getQueryParams(row, 'dub')).toEqual({ id: 1, owner_id: 7, action: 'dub' });
	});

	it('recomputes the visible columns after a checkbox change', async () => {
		tables.fetchTable.mockResolvedValue(response());
		const data = useTableData();
		await data.fetchRows(params);
		const name = data.columns.find((column) => column.title === 'name');
		if (name) name.selected = false;
		data.changeColumnList();
		expect(data.displayedDataColumns).not.toContain('name');
	});

	it('stops loading and keeps its state when the request fails', async () => {
		tables.fetchTable.mockRejectedValue(new Error('boom'));
		const data = useTableData();
		await data.fetchRows(params);
		expect(data.loading).toBe(false);
		expect(data.structure).toBeNull();
	});

	it('ignores a response that a newer request has overtaken', async () => {
		let resolveFirst: (value: TableRowsFullResponse) => void = () => {};
		tables.fetchTable
			.mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
			.mockResolvedValueOnce(response({ rows: [{ id: 9, name: 'Zed', active: 1, owner_id: null }] }));
		const data = useTableData();
		const first = data.fetchRows(params);
		await data.fetchRows({ ...params, tableName: 'other' });
		resolveFirst(response());
		await first;
		expect(data.rows.map((row) => row.id)).toEqual([9]);
	});
});
