// Ports db-table-row-view.component.spec.ts plus the related-records formatting.
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { TableField, TableRow } from '@/models/table';
import {
	formatReferencedRecords,
	getDedicatedPageLink,
	getDedicatedPageLinkParams,
	getForeignKeyQueryParams,
	getForeignKeyValue,
	referencedTablesURLParams,
	rowViewColumns,
	useRelatedRecords,
} from './useRowView';

const tables = vi.hoisted(() => ({ fetchTable: vi.fn() }));
vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));

function row(overrides: Partial<TableRow>): TableRow {
	return {
		connectionID: 'conn',
		tableName: 'orders',
		record: {},
		columnsOrder: [],
		primaryKeys: {},
		foreignKeys: {
			user_id: {
				column_name: 'user_id',
				constraint_name: 'fk_user',
				referenced_column_name: 'id',
				referenced_table_name: 'users',
			},
		},
		foreignKeysList: ['user_id'],
		widgets: {},
		widgetsList: [],
		fieldsTypes: {},
		relatedRecords: null,
		link: '/dashboard/conn/orders/entry',
		...overrides,
	};
}

const field = (column_name: string): TableField => ({
	column_name,
	column_default: null,
	data_type: 'varchar',
	isExcluded: false,
	isSearched: false,
	allow_null: true,
	auto_increment: false,
	character_maximum_length: null,
});

describe('row view helpers', () => {
	describe('getForeignKeyValue', () => {
		it('returns null when the field is null or missing', () => {
			expect(getForeignKeyValue(row({ record: { user_id: null } }), 'user_id')).toBeNull();
			expect(getForeignKeyValue(row({ record: {} }), 'user_id')).toBeNull();
		});

		it('returns the identity column value when the FK object has one', () => {
			expect(getForeignKeyValue(row({ record: { user_id: { id: 42, name: 'alice' } } }), 'user_id')).toBe('alice');
		});

		it('returns a primitive FK value as-is, including 0 and an empty string', () => {
			expect(getForeignKeyValue(row({ record: { user_id: 0 } }), 'user_id')).toBe(0);
			expect(getForeignKeyValue(row({ record: { user_id: '' } }), 'user_id')).toBe('');
		});
	});

	describe('getForeignKeyQueryParams', () => {
		it('returns {} when the field is null', () => {
			expect(getForeignKeyQueryParams(row({ record: { user_id: null } }), 'user_id')).toEqual({});
		});

		it('returns the referenced column param for an object or a primitive FK', () => {
			expect(getForeignKeyQueryParams(row({ record: { user_id: { id: 42, name: 'alice' } } }), 'user_id')).toEqual({
				id: 42,
			});
			expect(getForeignKeyQueryParams(row({ record: { user_id: 7 } }), 'user_id')).toEqual({ id: 7 });
		});
	});

	it('lists the fields in the table order, widget names first', () => {
		const open = row({
			record: { id: 1, user_id: 2 },
			columnsOrder: ['user_id', 'id'],
			widgets: { id: { field_name: 'id', widget_type: 'String', widget_params: {}, name: 'Number', description: '' } },
		});
		expect(rowViewColumns(open)).toEqual([
			{ title: 'user_id', normalizedTitle: 'User ID' },
			{ title: 'id', normalizedTitle: 'Number' },
		]);
		expect(rowViewColumns(row({ record: { a: 1 }, columnsOrder: [] }))).toEqual([{ title: 'a', normalizedTitle: 'A' }]);
	});

	it('links to the record page by its primary key, foreign keys by their referenced value', () => {
		const open = row({
			record: { id: 3, user_id: { id: 42, name: 'alice' } },
			primaryKeys: { id: 3, user_id: { id: 42 } },
		});
		expect(getDedicatedPageLinkParams(open)).toEqual({ id: 3, user_id: 42 });
		expect(getDedicatedPageLink(open, 'https://app.test')).toBe(
			'https://app.test/dashboard/conn/orders/entry?id=3&user_id=42',
		);
	});

	it('filters each referencing table by the open row', () => {
		const open = row({
			record: { id: 5 },
			relatedRecords: {
				referenced_on_column_name: 'id',
				referenced_by: [{ table_name: 'payments', column_name: 'order_id' }],
			},
		});
		expect(referencedTablesURLParams(open)).toEqual([{ filters: '(order_id:(eq:5))', page_index: 0 }]);
	});

	it('formats referencing rows with an identity line, three fields and entry links', () => {
		const formatted = formatReferencedRecords({
			rows: [{ id: 1, title: 'First', user_id: { id: 9, name: 'Ann' }, a: 'x', b: 'y', c: 'z' }],
			structure: ['id', 'title', 'user_id', 'a', 'b', 'c'].map(field),
			primaryColumns: [{ column_name: 'id', data_type: 'integer' }],
			foreignKeys: [
				{ column_name: 'user_id', constraint_name: 'fk', referenced_column_name: 'id', referenced_table_name: 'users' },
			],
			widgets: [{ field_name: 'title', widget_type: 'String', widget_params: '', name: 'Headline', description: '' }],
			pagination: { total: 1, lastPage: 1, perPage: 30, currentPage: 1 },
			identity_column: 'title',
			list_fields: [],
		});
		expect(formatted.rows[0]?.user_id).toBe('Ann');
		expect(formatted.identityColumn).toEqual({ isSet: true, fieldName: 'title', displayName: 'Headline' });
		expect(formatted.fieldsOrder.map((entry) => entry.fieldName)).toEqual(['id', 'user_id', 'a']);
		expect(formatted.links).toEqual([{ mode: 'view', id: 1 }]);
	});
});

describe('useRelatedRecords', () => {
	beforeEach(() => vi.clearAllMocks());

	it('fetches each referencing table filtered by the open row', async () => {
		tables.fetchTable.mockResolvedValue({
			rows: [],
			structure: [field('id')],
			primaryColumns: [],
			foreignKeys: [],
			widgets: [],
			pagination: { total: 0, lastPage: 1, perPage: 30, currentPage: 1 },
			list_fields: [],
		});
		const selected = ref<TableRow | null>(null);
		const related = useRelatedRecords(selected);
		selected.value = row({
			record: { id: 5 },
			columnsOrder: ['id'],
			relatedRecords: {
				referenced_on_column_name: 'id',
				referenced_by: [{ table_name: 'payments', column_name: 'order_id' }],
			},
		});
		await flushPromises();
		expect(tables.fetchTable).toHaveBeenCalledWith({
			connectionID: 'conn',
			tableName: 'payments',
			requstedPage: 1,
			chunkSize: 30,
			filters: { order_id: { eq: 5 } },
		});
		expect(related.tables.value.map((table) => table.displayTableName)).toEqual(['Payments']);
		expect(related.records.payments?.rows).toEqual([]);
	});
});
