import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { Connection, ConnectionType, DBtype } from 'src/app/models/connection';
import { ConnectionsService } from 'src/app/services/connections.service';
import { TableRowService } from 'src/app/services/table-row.service';
import { TablesService } from 'src/app/services/tables.service';
import { DbTableRowEditComponent } from './db-table-row-edit.component';

describe('DbTableRowEditComponent', () => {
	let component: DbTableRowEditComponent;
	let fixture: ComponentFixture<DbTableRowEditComponent>;
	let _tablesService: TablesService;
	let connectionsService: ConnectionsService;

	beforeEach(async () => {
		const matSnackBarSpy = { open: vi.fn() };

		await TestBed.configureTestingModule({
			imports: [MatSnackBarModule, MatDialogModule, Angulartics2Module.forRoot(), DbTableRowEditComponent],
			providers: [provideHttpClient(), provideRouter([]), { provide: MatSnackBar, useValue: matSnackBarSpy }],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(DbTableRowEditComponent);
		component = fixture.componentInstance;
		_tablesService = TestBed.inject(TablesService);
		connectionsService = TestBed.inject(ConnectionsService);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should set connection id', () => {
		vi.spyOn(connectionsService, 'currentConnectionID', 'get').mockReturnValue('12345678');

		component.ngOnInit();
		fixture.detectChanges();

		expect(component.connectionID).toEqual('12345678');
	});

	it('should set structure — define: relation between column name and type, required columns', async () => {
		component.tableForeignKeys = [
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

		const fakeProduct_categories = {
			column_name: 'product_categories',
			column_default: null,
			data_type: 'enum',
			data_type_params: ['food', 'drinks', 'cleaning'],
			isExcluded: false,
			isSearched: false,
			auto_increment: false,
			allow_null: true,
			character_maximum_length: 1,
		};

		const fakeCustomer_categories = {
			column_name: 'customer_categories',
			column_default: null,
			data_type: 'enum',
			data_type_params: ['manager', 'seller'],
			isExcluded: false,
			isSearched: false,
			auto_increment: false,
			allow_null: true,
			character_maximum_length: 1,
		};

		const fakeCustomerId = {
			column_name: 'CustomerId',
			column_default: null,
			data_type: 'int',
			isExcluded: false,
			isSearched: true,
			auto_increment: false,
			allow_null: false,
			character_maximum_length: null,
		};

		const fakeProductId = {
			column_name: 'ProductId',
			column_default: null,
			data_type: 'int',
			isExcluded: false,
			isSearched: true,
			auto_increment: false,
			allow_null: false,
			character_maximum_length: null,
		};

		const fakeBool = {
			column_name: 'bool',
			column_default: null,
			data_type: 'tinyint',
			isExcluded: false,
			isSearched: false,
			auto_increment: false,
			allow_null: true,
			character_maximum_length: 1,
		};

		const fakeFloat = {
			column_name: 'float',
			column_default: null,
			data_type: 'float',
			isExcluded: false,
			isSearched: false,
			auto_increment: false,
			allow_null: true,
			character_maximum_length: 102,
		};

		const fakeStructure = [
			fakeProduct_categories,
			fakeCustomer_categories,
			fakeCustomerId,
			fakeProductId,
			fakeBool,
			fakeFloat,
		];

		component.setRowStructure(fakeStructure);

		expect(component.tableRowRequiredValues).toEqual({
			product_categories: false,
			customer_categories: false,
			CustomerId: true,
			ProductId: true,
			bool: false,
			float: false,
		});
		expect(component.tableRowStructure).toEqual({
			product_categories: fakeProduct_categories,
			customer_categories: fakeCustomer_categories,
			CustomerId: fakeCustomerId,
			ProductId: fakeProductId,
			bool: fakeBool,
			float: fakeFloat,
		});
	});

	it('should set widgets', () => {
		const fakeWidgets = [
			{
				id: '36141f10-feb6-4c42-acdb-261523729625',
				field_name: 'CustomerId',
				widget_type: 'Textarea',
				widget_params: '',
				name: 'Customer',
				description: '',
			},
			{
				id: 'd6a4caa5-68f6-455f-90ff-2ad81856253b',
				field_name: 'Price',
				widget_type: 'Number',
				widget_params: '',
				name: '',
				description: 'Prices are pointed in USD',
			},
		];

		component.setWidgets(fakeWidgets);

		expect(component.tableWidgetsList).toEqual(['CustomerId', 'Price']);
		expect(component.tableWidgets).toEqual({
			CustomerId: {
				id: '36141f10-feb6-4c42-acdb-261523729625',
				field_name: 'CustomerId',
				widget_type: 'Textarea',
				widget_params: null,
				name: 'Customer',
				description: '',
			},
			Price: {
				id: 'd6a4caa5-68f6-455f-90ff-2ad81856253b',
				field_name: 'Price',
				widget_type: 'Number',
				widget_params: null,
				name: '',
				description: 'Prices are pointed in USD',
			},
		});
	});

	it('should return foreign key relations by column name', () => {
		component.tableForeignKeys = [
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

		const foreignKeyRelations = component.getRelations('ProductId');
		expect(foreignKeyRelations).toEqual({
			referenced_column_name: 'Id',
			referenced_table_name: 'Products',
			constraint_name: 'Orders_ibfk_1',
			column_name: 'ProductId',
		});
	});

	it('should check if field is readonly', () => {
		component.readonlyFields = ['Id', 'Price'];

		const isPriceReafonly = component.isReadonlyField('Price');
		expect(isPriceReafonly).toBe(true);
	});

	it('should check if field is widget', () => {
		component.tableWidgetsList = ['CustomerId', 'Price'];

		const isPriceWidget = component.isWidget('Price');
		expect(isPriceWidget).toBe(true);
	});

	describe('updateField for password widget behavior', () => {
		beforeEach(() => {
			component.tableRowValues = {
				id: 1,
				username: 'testuser',
				password: '***',
			};
		});

		it('should update tableRowValues when password field receives a value', () => {
			component.updateField('newPassword', 'password');
			expect(component.tableRowValues.password).toBe('newPassword');
		});

		it('should update tableRowValues when password field receives empty string', () => {
			component.updateField('', 'password');
			expect(component.tableRowValues.password).toBe('');
		});

		it('should update tableRowValues when password field receives null (clear password)', () => {
			component.updateField(null, 'password');
			expect(component.tableRowValues.password).toBe(null);
		});

		it('should handle password field update alongside other fields', () => {
			component.updateField('updatedUser', 'username');
			component.updateField('newPassword', 'password');

			expect(component.tableRowValues.username).toBe('updatedUser');
			expect(component.tableRowValues.password).toBe('newPassword');
		});
	});

	describe('getFormattedUpdatedRow', () => {
		beforeEach(() => {
			vi.spyOn(connectionsService, 'currentConnection', 'get').mockReturnValue({
				id: 'test-id',
				database: 'test-db',
				title: 'Test Connection',
				host: 'localhost',
				port: '5432',
				sid: null,
				type: DBtype.Postgres,
				username: 'test-user',
				ssh: false,
				ssl: false,
				cert: '',
				masterEncryption: false,
				azure_encryption: false,
				connectionType: ConnectionType.Direct,
			} as Connection);
			component.tableTypes = {};
			component.nonModifyingFields = [];
			component.pageAction = null;
		});

		describe('onlyTouched filtering', () => {
			beforeEach(() => {
				component.tableRowValues = {
					id: 1,
					username: 'original',
					email: 'a@x.test',
					bio: 'hello',
				};
			});

			it('returns all fields by default', () => {
				const result = component.getFormattedUpdatedRow();
				expect(Object.keys(result).sort()).toEqual(['bio', 'email', 'id', 'username']);
			});

			it('returns only touched fields when onlyTouched=true', () => {
				component.updateField('renamed', 'username');
				const result = component.getFormattedUpdatedRow(true);
				expect(result).toEqual({ username: 'renamed' });
			});

			it('returns empty object when nothing was touched', () => {
				const result = component.getFormattedUpdatedRow(true);
				expect(result).toEqual({});
			});

			it('tracks multiple touched fields', () => {
				component.updateField('renamed', 'username');
				component.updateField('b@x.test', 'email');
				const result = component.getFormattedUpdatedRow(true);
				expect(result).toEqual({ username: 'renamed', email: 'b@x.test' });
			});
		});

		it('should include password field when it has a value', () => {
			component.tableRowValues = {
				id: 1,
				username: 'testuser',
				password: 'newPassword',
			};

			const result = component.getFormattedUpdatedRow();
			expect((result as any).password).toBe('newPassword');
		});

		it('should include password field when it is null (explicit clear)', () => {
			component.tableRowValues = {
				id: 1,
				username: 'testuser',
				password: null,
			};

			const result = component.getFormattedUpdatedRow();
			expect((result as any).password).toBe(null);
		});

		it('should include password field when it is empty string', () => {
			component.tableRowValues = {
				id: 1,
				username: 'testuser',
				password: '',
			};

			const result = component.getFormattedUpdatedRow();
			expect((result as any).password).toBe('');
		});

		it('should preserve other fields when password is empty', () => {
			component.tableRowValues = {
				id: 1,
				username: 'testuser',
				password: '',
			};

			const result = component.getFormattedUpdatedRow();
			expect((result as any).id).toBe(1);
			expect((result as any).username).toBe('testuser');
			expect((result as any).password).toBe('');
		});
	});

	// Integration-style: render the edit form with FK and binary widgets, then save.
	// FK widget (foreign-key.component.ts:120) and Binary widget (binary.component.ts:27)
	// both re-emit their current value on ngOnInit. Touched-tracking MUST ignore those
	// init-time emits — otherwise every edit PUT silently re-writes FK/binary columns
	// the user never touched.
	describe('render + save: untouched FK and binary fields are not sent', () => {
		let tableRowService: TableRowService;
		let updateTableRowSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(async () => {
			tableRowService = TestBed.inject(TableRowService);
			const tablesService = TestBed.inject(TablesService);

			updateTableRowSpy = vi
				.spyOn(tableRowService, 'updateTableRow')
				.mockReturnValue(of({ row: { id: '42' }, primaryColumns: [{ column_name: 'id' }] } as any));

			// FK widget loads its current row + autocomplete suggestions via fetchTable.
			// Both calls must resolve so its ngOnInit can reach the onFieldChange.emit.
			vi.spyOn(tablesService, 'fetchTable').mockReturnValue(
				of({
					rows: [{ id: 7, name: 'Alice' }],
					primaryColumns: [{ column_name: 'id', data_type: 'int' }],
					identity_column: 'name',
				} as any),
			);

			vi.spyOn(connectionsService, 'currentConnection', 'get').mockReturnValue({
				id: 'conn-1',
				database: 'shop',
				title: 'Shop',
				host: 'localhost',
				port: '5432',
				sid: null,
				type: DBtype.Postgres,
				username: 'u',
				ssh: false,
				ssl: false,
				cert: '',
				masterEncryption: false,
				azure_encryption: false,
				connectionType: ConnectionType.Direct,
			} as Connection);
			vi.spyOn(connectionsService, 'currentConnectionID', 'get').mockReturnValue('conn-1');

			// Overwrite whatever the initial (failing) ngOnInit left, then render.
			component.connectionID = 'conn-1';
			component.tableName = 'orders';
			component.hasKeyAttributesFromURL = true;
			component.keyAttributesFromURL = { id: '42' };
			component.keyAttributesListFromStructure = ['id'];
			component.readonlyFields = [];
			component.nonModifyingFields = [];
			component.pageMode = 'edit';
			component.pageAction = null;
			component.tableForeignKeys = [
				{
					column_name: 'CustomerId',
					referenced_column_name: 'id',
					referenced_table_name: 'customers',
					constraint_name: 'fk_customer',
					autocomplete_columns: [],
				} as any,
			];
			component.tableRowValues = {
				name: 'order-42',
				CustomerId: 7,
				payload: { type: 'Buffer', data: [1, 2, 3, 4] },
			};
			component.tableTypes = {
				name: 'varchar',
				CustomerId: 'foreign key',
				payload: 'bytea',
			};
			component.tableRowRequiredValues = { name: false, CustomerId: false, payload: false };
			component.tableRowStructure = {
				name: { column_name: 'name', data_type: 'varchar', allow_null: true },
				CustomerId: { column_name: 'CustomerId', data_type: 'integer', allow_null: true },
				payload: { column_name: 'payload', data_type: 'bytea', allow_null: true },
			} as any;
			component.fieldsOrdered = ['name', 'CustomerId', 'payload'];
			component.tableWidgetsList = [];
			component.tableWidgets = {};
			component.loading = false;

			fixture.detectChanges();
			await fixture.whenStable();
			fixture.detectChanges();
		});

		it('sends an empty body when the user did not touch any field', async () => {
			component.handleRowSubmitting(false);
			await fixture.whenStable();

			expect(updateTableRowSpy).toHaveBeenCalledTimes(1);
			const body = updateTableRowSpy.mock.calls[0][3];
			expect(body).toEqual({});
		});

		it('sends only the touched text field when the user edits name', async () => {
			// simulate the user typing into the text widget — same path the widget's
			// (onFieldChange) output would take through the template
			component.updateField('order-43', 'name');

			component.handleRowSubmitting(false);
			await fixture.whenStable();

			expect(updateTableRowSpy).toHaveBeenCalledTimes(1);
			const body = updateTableRowSpy.mock.calls[0][3];
			expect(body).toEqual({ name: 'order-43' });
			expect(body).not.toHaveProperty('CustomerId');
			expect(body).not.toHaveProperty('payload');
		});
	});
});
