import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, reactive } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { ApiError } from '@/api/client';
import BulkActionConfirmDialog from '@/components/dashboard/BulkActionConfirmationDialog.vue';
import { DBtype } from '@/models/connection';
import type { TableField } from '@/models/table';
import { useRowEdit } from './useRowEdit';

const connections = vi.hoisted(() => ({
	currentConnection: { type: 'postgres', isTestConnection: false } as { type: string; isTestConnection: boolean },
}));
const tables = vi.hoisted(() => ({
	fetchTableStructure: vi.fn(),
	fetchTable: vi.fn(),
	activateActions: vi.fn(),
}));
const tableRow = vi.hoisted(() => ({
	fetchTableRow: vi.fn(),
	addTableRow: vi.fn(),
	updateTableRow: vi.fn(),
}));
const tableState = vi.hoisted(() => ({
	getBackUrlFilters: vi.fn(),
	getBackUrlParams: vi.fn(),
	selectRow: vi.fn(),
}));
const notifications = vi.hoisted(() => ({ dismissAlert: vi.fn() }));
const permissions = vi.hoisted(() => ({ allowed: true }));
const dialog = vi.hoisted(() => ({ open: vi.fn(), result: true as unknown }));

vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => reactive(connections) }));
vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));
vi.mock('@/stores/table-row', () => ({ useTableRowStore: () => tableRow }));
vi.mock('@/stores/table-state', () => ({ useTableStateStore: () => tableState }));
vi.mock('@/stores/notifications', () => ({ useNotificationsStore: () => notifications }));
vi.mock('@/stores/cedar-permissions', () => ({
	useCedarPermissionsStore: () => ({ canI: () => computed(() => permissions.allowed) }),
}));
vi.mock('@/composables/useDialog', () => ({
	useDialog: () => ({
		open: (...args: unknown[]) => {
			dialog.open(...args);
			return { afterClosed: () => Promise.resolve(dialog.result) };
		},
	}),
}));

function field(column_name: string, overrides: Partial<TableField> = {}): TableField {
	return {
		column_name,
		column_default: null,
		data_type: 'varchar',
		isExcluded: false,
		isSearched: false,
		auto_increment: false,
		allow_null: true,
		character_maximum_length: null,
		...overrides,
	};
}

const foreignKeys = [
	{
		referenced_column_name: 'Id',
		referenced_table_name: 'Products',
		constraint_name: 'Orders_ibfk_1',
		column_name: 'ProductId',
	},
	{
		referenced_column_name: 'Id',
		referenced_table_name: 'Customers',
		constraint_name: 'Orders_ibfk_2',
		column_name: 'CustomerId',
	},
];

let router: Router;

async function setup() {
	router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
	});
	await router.push('/dashboard/conn-1/orders/entry');
	return useRowEdit({ connectionId: 'conn-1', tableName: 'orders', router });
}

function rowResponse(overrides: Record<string, unknown> = {}) {
	return {
		row: { id: '42', name: 'order-42', CustomerId: 7, payload: { type: 'Buffer', data: [1, 2, 3, 4] } },
		structure: [
			field('id', { data_type: 'integer', auto_increment: true, allow_null: false }),
			field('name'),
			field('CustomerId', { data_type: 'integer' }),
			field('payload', { data_type: 'bytea' }),
		],
		primaryColumns: [{ column_name: 'id', data_type: 'integer' }],
		foreignKeys: [
			{
				column_name: 'CustomerId',
				referenced_column_name: 'id',
				referenced_table_name: 'customers',
				constraint_name: 'fk',
			},
		],
		table_widgets: [],
		readonly_fields: [],
		list_fields: [],
		can_delete: true,
		...overrides,
	};
}

describe('useRowEdit', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
		connections.currentConnection = { type: DBtype.Postgres, isTestConnection: false };
		permissions.allowed = true;
		dialog.result = true;
		tableState.getBackUrlFilters.mockReturnValue(null);
		tableState.getBackUrlParams.mockReturnValue({ page_index: 2, page_size: 30 });
		tableRow.updateTableRow.mockResolvedValue({ row: { id: '42' }, primaryColumns: [{ column_name: 'id' }] });
	});

	it('sets the structure: column → field, and which columns are required', async () => {
		const rowEdit = await setup();
		rowEdit.setForeignKeys(foreignKeys);
		const structure = [
			field('product_categories', { data_type: 'enum', data_type_params: ['food', 'drinks'] }),
			field('CustomerId', { data_type: 'int', allow_null: false }),
			field('ProductId', { data_type: 'int', allow_null: false }),
			field('bool', { data_type: 'tinyint', character_maximum_length: 1 }),
			field('float', { data_type: 'float' }),
		];

		rowEdit.setRowStructure(structure);

		expect(rowEdit.tableRowRequiredValues.value).toEqual({
			product_categories: false,
			CustomerId: true,
			ProductId: true,
			bool: false,
			float: false,
		});
		expect(rowEdit.tableRowStructure.value.CustomerId).toEqual(structure[1]);
		expect(rowEdit.tableTypes.value).toEqual({
			product_categories: 'enum',
			CustomerId: 'foreign key',
			ProductId: 'foreign key',
			bool: 'boolean',
			float: 'float',
		});
	});

	it('sets the widgets, parsing their params (empty params become null)', async () => {
		const rowEdit = await setup();
		rowEdit.setWidgets([
			{ field_name: 'CustomerId', widget_type: 'Textarea', widget_params: '', name: 'Customer', description: '' },
			{
				field_name: 'Price',
				widget_type: 'Number',
				widget_params: '// unit\n{ unit: "USD" }',
				name: '',
				description: '',
			},
		]);

		expect(rowEdit.tableWidgetsList.value).toEqual(['CustomerId', 'Price']);
		expect(rowEdit.tableWidgets.value.CustomerId?.widget_params).toBeNull();
		expect(rowEdit.tableWidgets.value.Price?.widget_params).toEqual({ unit: 'USD' });
		expect(rowEdit.isWidget('Price')).toBe(true);
		expect(rowEdit.isWidget('Other')).toBe(false);
	});

	it('returns the foreign key relation of a column', async () => {
		const rowEdit = await setup();
		rowEdit.setForeignKeys(foreignKeys);
		expect(rowEdit.getRelations('ProductId')).toEqual(foreignKeys[0]);
	});

	it('checks whether a field is readonly', async () => {
		const rowEdit = await setup();
		rowEdit.readonlyFields.value = ['Id', 'Price'];
		expect(rowEdit.isReadonlyField('Price')).toBe(true);
		expect(rowEdit.isReadonlyField('Name')).toBe(false);
	});

	describe('add mode (no query params)', () => {
		it('loads the structure and starts every shown field empty (null when nullable)', async () => {
			tables.fetchTableStructure.mockResolvedValue({
				structure: [
					field('id', { data_type: 'integer', auto_increment: true }),
					field('name', { allow_null: false }),
					field('note'),
					field('secret'),
				],
				primaryColumns: [{ column_name: 'id', data_type: 'integer' }],
				foreignKeys: [],
				readonly_fields: [],
				table_widgets: [],
				excluded_fields: ['secret'],
				list_fields: ['note', 'name'],
				display_name: 'Orders!',
			});
			const rowEdit = await setup();
			await rowEdit.load({});

			expect(tables.fetchTableStructure).toHaveBeenCalledWith('conn-1', 'orders');
			expect(rowEdit.tableRowValues.value).toEqual({ name: '', note: null });
			expect(rowEdit.fieldsOrdered.value).toEqual(['note', 'name']);
			expect(rowEdit.pageTitle.value).toBe('Add row');
			expect(rowEdit.loading.value).toBe(false);
			expect(document.title).toBe('Orders! - Add new record | Rocketadmin');
		});

		it('adds the row and goes back to the table with the saved filters', async () => {
			tableState.getBackUrlFilters.mockReturnValue({ name: { eq: 'x' } });
			tables.fetchTableStructure.mockResolvedValue({
				structure: [field('name')],
				primaryColumns: [{ column_name: 'id', data_type: 'integer' }],
				foreignKeys: [],
				readonly_fields: [],
				table_widgets: [],
				excluded_fields: [],
				list_fields: [],
			});
			tableRow.addTableRow.mockResolvedValue({ row: { id: 5, name: 'n' }, primaryColumns: [{ column_name: 'id' }] });
			const rowEdit = await setup();
			await rowEdit.load({});
			rowEdit.updateField('n', 'name');

			await rowEdit.handleRowSubmitting(false);
			await flushPromises();

			expect(tableRow.addTableRow).toHaveBeenCalledWith('conn-1', 'orders', { name: 'n' });
			expect(router.currentRoute.value.path).toBe('/dashboard/conn-1/orders');
			expect(router.currentRoute.value.query).toEqual({ filters: '(name:(eq:x))', page_index: '0' });
			expect(notifications.dismissAlert).toHaveBeenCalled();
		});

		it('"Save & continue" opens the new row for editing', async () => {
			tables.fetchTableStructure.mockResolvedValue({
				structure: [field('name')],
				primaryColumns: [{ column_name: 'id', data_type: 'integer' }],
				foreignKeys: [],
				readonly_fields: [],
				table_widgets: [],
				excluded_fields: [],
				list_fields: [],
			});
			tableRow.addTableRow.mockResolvedValue({ row: { id: 5, name: 'n' }, primaryColumns: [{ column_name: 'id' }] });
			const rowEdit = await setup();
			await rowEdit.load({});

			await rowEdit.handleRowSubmitting(true);
			await flushPromises();

			expect(router.currentRoute.value.path).toBe('/dashboard/conn-1/orders/entry');
			expect(router.currentRoute.value.query).toEqual({ id: '5' });
		});
	});

	describe('edit mode (primary key in the query)', () => {
		it('loads the row; columns the user cannot set are readonly', async () => {
			tableRow.fetchTableRow.mockResolvedValue(rowResponse({ readonly_fields: ['name'] }));
			const rowEdit = await setup();
			await rowEdit.load({ id: '42' });

			expect(tableRow.fetchTableRow).toHaveBeenCalledWith('conn-1', 'orders', { id: '42' });
			expect(rowEdit.hasKeyAttributesFromURL.value).toBe(true);
			expect(rowEdit.keyAttributesFromURL.value).toEqual({ id: '42' });
			expect(rowEdit.dubURLParams.value).toEqual({ id: '42', action: 'dub' });
			expect(rowEdit.nonModifyingFields.value).toEqual(['id']);
			expect(rowEdit.readonlyFields.value).toEqual(['name', 'id']);
			expect(rowEdit.fieldsOrdered.value).toEqual(['id', 'name', 'CustomerId', 'payload']);
			expect(rowEdit.canDelete.value).toBe(true);
			expect(rowEdit.pageTitle.value).toBe('Edit row');
		});

		it('makes the primary key readonly for DynamoDB and never sends it', async () => {
			connections.currentConnection = { type: DBtype.Dynamo, isTestConnection: false };
			tableRow.fetchTableRow.mockResolvedValue(
				rowResponse({ structure: [field('id'), field('name')], row: { id: '42', name: 'a' } }),
			);
			const rowEdit = await setup();
			await rowEdit.load({ id: '42' });

			expect(rowEdit.readonlyFields.value).toContain('id');
			rowEdit.updateField('b', 'name');
			rowEdit.updateField('43', 'id');
			expect(rowEdit.getFormattedUpdatedRow(true)).toEqual({ name: 'b' });
		});

		it('sends an empty body when the user did not touch any field', async () => {
			tableRow.fetchTableRow.mockResolvedValue(rowResponse());
			const rowEdit = await setup();
			await rowEdit.load({ id: '42' });
			// Widgets re-emitting their current value on mount do not count as edits.
			rowEdit.updateField(7, 'CustomerId');
			rowEdit.updateField({ type: 'Buffer', data: [1, 2, 3, 4] }, 'payload');

			await rowEdit.handleRowSubmitting(false);

			expect(tableRow.updateTableRow).toHaveBeenCalledTimes(1);
			expect(tableRow.updateTableRow.mock.calls[0]?.[3]).toEqual({});
		});

		it('sends only the touched field and goes back to the table view it came from', async () => {
			tableRow.fetchTableRow.mockResolvedValue(rowResponse());
			const rowEdit = await setup();
			await rowEdit.load({ id: '42' });
			rowEdit.updateField('order-43', 'name');

			await rowEdit.handleRowSubmitting(false);
			await flushPromises();

			expect(tableRow.updateTableRow).toHaveBeenCalledWith('conn-1', 'orders', { id: '42' }, { name: 'order-43' });
			expect(router.currentRoute.value.path).toBe('/dashboard/conn-1/orders');
			expect(router.currentRoute.value.query).toEqual({ page_index: '2', page_size: '30' });
		});

		it('"Save & continue" reopens the row under its new key when the key changed', async () => {
			tableRow.fetchTableRow.mockResolvedValue(rowResponse());
			tableRow.updateTableRow.mockResolvedValue({ row: { id: '99' }, primaryColumns: [{ column_name: 'id' }] });
			const rowEdit = await setup();
			await rowEdit.load({ id: '42' });
			rowEdit.updateField('99', 'id');

			await rowEdit.handleRowSubmitting(true);
			await flushPromises();

			expect(router.currentRoute.value.path).toBe('/dashboard/conn-1/orders/entry');
			expect(router.currentRoute.value.query).toEqual({ id: '99' });
		});

		it('duplicating adds a new row without the columns it cannot set', async () => {
			tableRow.fetchTableRow.mockResolvedValue(rowResponse());
			tableRow.addTableRow.mockResolvedValue({ row: { id: 50 }, primaryColumns: [{ column_name: 'id' }] });
			const rowEdit = await setup();
			await rowEdit.load({ id: '42', action: 'dub' });

			expect(rowEdit.pageTitle.value).toBe('Duplicate row');
			expect(rowEdit.fieldsOrdered.value).toEqual(['name', 'CustomerId', 'payload']);
			await rowEdit.handleRowSubmitting(false);

			expect(tableRow.updateTableRow).not.toHaveBeenCalled();
			expect(tableRow.addTableRow.mock.calls[0]?.[2]).not.toHaveProperty('id');
		});

		it('shows the server error when the row cannot be loaded', async () => {
			tableRow.fetchTableRow.mockRejectedValue(
				new ApiError('Row not found', 400, { message: 'Row not found', originalMessage: 'No such key' }),
			);
			const rowEdit = await setup();
			await rowEdit.load({ id: '1' });

			expect(rowEdit.isServerError.value).toBe(true);
			expect(rowEdit.serverError.value).toEqual({ abstract: 'Row not found', details: 'No such key' });
			expect(rowEdit.loading.value).toBe(false);
		});

		it('view mode titles the page "View row" and switching to edit drops the mode', async () => {
			tableRow.fetchTableRow.mockResolvedValue(rowResponse());
			const rowEdit = await setup();
			await rowEdit.load({ id: '42', mode: 'view' });
			expect(rowEdit.pageTitle.value).toBe('View row');
			expect(rowEdit.fieldsReadonly.value).toBe(true);

			rowEdit.switchToEditMode();
			await flushPromises();
			expect(router.currentRoute.value.query).toEqual({ id: '42' });
		});
	});

	describe('updateField', () => {
		it('stores plain values, including empty and null (a password being cleared)', async () => {
			const rowEdit = await setup();
			rowEdit.tableRowValues.value = { id: 1, username: 'testuser', password: '***' };

			rowEdit.updateField('newPassword', 'password');
			expect(rowEdit.tableRowValues.value.password).toBe('newPassword');
			rowEdit.updateField('', 'password');
			expect(rowEdit.tableRowValues.value.password).toBe('');
			rowEdit.updateField(null, 'password');
			expect(rowEdit.tableRowValues.value.password).toBeNull();
			rowEdit.updateField('updatedUser', 'username');
			expect(rowEdit.tableRowValues.value.username).toBe('updatedUser');
		});

		it('updates an object value in place', async () => {
			const rowEdit = await setup();
			const point = { x: 1, y: 2 };
			rowEdit.tableRowValues.value = { point };
			const stored = rowEdit.tableRowValues.value.point;

			rowEdit.updateField({ x: 3 }, 'point');

			expect(rowEdit.tableRowValues.value.point).toBe(stored);
			expect(rowEdit.tableRowValues.value.point).toEqual({ x: 3 });
		});
	});

	describe('getFormattedUpdatedRow', () => {
		it('returns all fields by default and only the touched ones on request', async () => {
			const rowEdit = await setup();
			rowEdit.tableRowValues.value = { id: 1, username: 'original', email: 'a@x.test', password: '' };

			expect(Object.keys(rowEdit.getFormattedUpdatedRow()).sort()).toEqual(['email', 'id', 'password', 'username']);
			expect(rowEdit.getFormattedUpdatedRow(true)).toEqual({});

			rowEdit.updateField('renamed', 'username');
			rowEdit.updateField('b@x.test', 'email');
			expect(rowEdit.getFormattedUpdatedRow(true)).toEqual({ username: 'renamed', email: 'b@x.test' });
		});

		it('parses JSON columns and sends an empty one as null', async () => {
			const rowEdit = await setup();
			rowEdit.tableTypes.value = { data: 'json', tags: 'jsonb' };
			rowEdit.tableRowValues.value = { data: '{"a":1}', tags: '' };

			expect(rowEdit.getFormattedUpdatedRow()).toEqual({ data: { a: 1 }, tags: null });
		});

		it('strips the ISO decoration from MySQL datetimes and dates', async () => {
			connections.currentConnection = { type: DBtype.MySQL, isTestConnection: false };
			const rowEdit = await setup();
			rowEdit.tableTypes.value = { created: 'datetime', day: 'date' };
			rowEdit.tableRowValues.value = { created: '2024-01-02T03:04:05.000Z', day: '2024-01-02T00:00:00.000Z' };

			expect(rowEdit.getFormattedUpdatedRow()).toEqual({ created: '2024-01-02 03:04:05', day: '2024-01-02' });
		});
	});

	describe('actions', () => {
		it('deleting asks for confirmation and goes back to the table once the row is deleted', async () => {
			tableRow.fetchTableRow.mockResolvedValue(rowResponse());
			const rowEdit = await setup();
			await rowEdit.load({ id: '42' });

			await rowEdit.handleDeleteRow();
			await flushPromises();

			expect(dialog.open).toHaveBeenCalledWith(BulkActionConfirmDialog, {
				data: { id: undefined, title: 'Delete row', primaryKeys: [{ id: '42' }], tableDisplayName: 'Orders' },
			});
			expect(router.currentRoute.value.path).toBe('/dashboard/conn-1/orders');
		});

		it('stays on the row when the delete is cancelled', async () => {
			dialog.result = undefined;
			tableRow.fetchTableRow.mockResolvedValue(rowResponse());
			const rowEdit = await setup();
			await rowEdit.load({ id: '42' });

			await rowEdit.handleDeleteRow();
			await flushPromises();

			expect(router.currentRoute.value.path).toBe('/dashboard/conn-1/orders/entry');
		});

		it('runs an action without confirmation directly and opens the link it answers with', async () => {
			tables.activateActions.mockResolvedValue({ location: 'https://example.test/go' });
			tableRow.fetchTableRow.mockResolvedValue(rowResponse());
			const rowEdit = await setup();
			await rowEdit.load({ id: '42' });

			await rowEdit.handleActivateAction({ id: 'a1', title: 'Ping', require_confirmation: false });

			expect(tables.activateActions).toHaveBeenCalledWith('conn-1', 'orders', 'a1', 'Ping', [{ id: '42' }]);
			expect(dialog.open).toHaveBeenCalledWith(expect.anything(), {
				data: { href: 'https://example.test/go', actionName: 'Ping', primaryKeys: { id: '42' } },
			});
		});
	});

	describe('related records', () => {
		it('loads the first page of every referencing table, filtered by the row', async () => {
			tableRow.fetchTableRow.mockResolvedValueOnce(
				rowResponse({
					referenced_table_names_and_columns: [
						{
							referenced_on_column_name: 'id',
							referenced_by: [{ table_name: 'order_items', column_name: 'order_id' }],
						},
					],
				}),
			);
			tableRow.fetchTableRow.mockResolvedValue({ referenced_table_names_and_columns: [] });
			tables.fetchTable.mockResolvedValue({
				rows: [{ item_id: 1, title: 'Pen', qty: 2 }],
				structure: [field('item_id'), field('title'), field('qty')],
				primaryColumns: [{ column_name: 'item_id', data_type: 'integer' }],
				foreignKeys: [],
				widgets: [],
				list_fields: [],
				identity_column: 'title',
			});
			const rowEdit = await setup();
			await rowEdit.load({ id: '42' });
			await flushPromises();

			expect(rowEdit.referencedTables.value).toEqual([
				{ table_name: 'order_items', column_name: 'order_id', displayTableName: 'Order Items' },
			]);
			expect(rowEdit.referencedTablesURLParams.value).toEqual([{ filters: "(order_id:(eq:'42'))", page_index: 0 }]);
			expect(tables.fetchTable).toHaveBeenCalledWith(
				expect.objectContaining({ tableName: 'order_items', filters: { order_id: { eq: '42' } }, chunkSize: 30 }),
			);
			expect(rowEdit.referencedRecords.value.order_items).toMatchObject({
				identityColumn: { isSet: true, name: 'title', displayName: 'Title' },
				fieldsOrder: [
					{ fieldName: 'item_id', displayName: 'Item ID' },
					{ fieldName: 'qty', displayName: 'Qty' },
				],
			});

			rowEdit.handleViewRow('order_items', { item_id: 1, title: 'Pen', qty: 2 });
			expect(tableState.selectRow).toHaveBeenCalledWith(
				expect.objectContaining({ tableName: 'order_items', primaryKeys: { item_id: 1 } }),
			);
		});
	});

	it('follows the table permissions', async () => {
		permissions.allowed = false;
		const rowEdit = await setup();
		expect(rowEdit.canEditRow.value).toBe(false);
		expect(rowEdit.fieldsReadonly.value).toBe(true);
	});
});
