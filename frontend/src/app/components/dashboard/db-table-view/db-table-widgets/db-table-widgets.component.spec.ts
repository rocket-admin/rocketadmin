import { provideHttpClient } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { CodeEditorModule } from '@ngstack/code-editor';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { ConnectionsService } from 'src/app/services/connections.service';
import { TablesService } from 'src/app/services/tables.service';
import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
import { CodeEditComponent } from '../../../ui-components/record-edit-fields/code/code.component';
import { MarkdownEditComponent } from '../../../ui-components/record-edit-fields/markdown/markdown.component';
import { DashboardComponent } from '../../dashboard.component';
import { DbTableWidgetsComponent } from './db-table-widgets.component';
import { WidgetComponent } from './widget/widget.component';
import { WidgetDeleteDialogComponent } from './widget-delete-dialog/widget-delete-dialog.component';

describe('DbTableWidgetsComponent', () => {
	let component: DbTableWidgetsComponent;
	let fixture: ComponentFixture<DbTableWidgetsComponent>;
	let tablesService: TablesService;
	let connectionsService: ConnectionsService;
	let dialog: MatDialog;
	const dialogRefSpyObj = {
		afterClosed: vi.fn().mockReturnValue(of('delete')),
		close: vi.fn(),
		componentInstance: { deleteWidget: of('user_name') },
	};

	const fakeFirstName = {
		column_name: 'FirstName',
		column_default: null,
		data_type: 'varchar',
		isExcluded: false,
		isSearched: false,
		auto_increment: false,
		allow_null: false,
		character_maximum_length: 30,
	};
	const fakeId = {
		column_name: 'Id',
		column_default: 'auto_increment',
		data_type: 'int',
		isExcluded: false,
		isSearched: false,
		auto_increment: true,
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

	const mockTableStructure = {
		structure: [fakeFirstName, fakeId, fakeBool],
		primaryColumns: [
			{
				data_type: 'int',
				column_name: 'Id',
			},
		],
		foreignKeys: [
			{
				referenced_column_name: 'CustomerId',
				referenced_table_name: 'Customers',
				constraint_name: 'Orders_ibfk_2',
				column_name: 'Id',
			},
		],
		readonly_fields: [],
		table_widgets: [],
	};

	const tableWidgetsNetwork = [
		{
			id: 'a57e0c7f-a348-4aae-9ec4-fdbec0c0d0b6',
			field_name: 'email',
			widget_type: 'Textarea',
			widget_params: '',
			name: 'user email',
			description: '',
		},
	];

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [
				RouterTestingModule.withRoutes([
					{ path: 'dashboard/:connection-id/:table-name', component: DashboardComponent },
				]),
				MatSnackBarModule,
				MatDialogModule,
				BrowserAnimationsModule,
				Angulartics2Module.forRoot(),
				DbTableWidgetsComponent,
			],
			providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }],
		})
			.overrideComponent(WidgetComponent, {
				remove: { imports: [CodeEditorModule] },
				add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] },
			})
			.overrideComponent(CodeEditComponent, {
				remove: { imports: [CodeEditorModule] },
				add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] },
			})
			.overrideComponent(MarkdownEditComponent, {
				remove: { imports: [CodeEditorModule] },
				add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] },
			})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(DbTableWidgetsComponent);
		component = fixture.componentInstance;
		tablesService = TestBed.inject(TablesService);
		connectionsService = TestBed.inject(ConnectionsService);
		dialog = TestBed.inject(MatDialog);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should set connection id and table name', () => {
		vi.spyOn(connectionsService, 'currentConnectionID', 'get').mockReturnValue('12345678');
		vi.spyOn(tablesService, 'currentTableName', 'get').mockReturnValue('Users');
		vi.spyOn(tablesService, 'fetchTableStructure').mockReturnValue(of(mockTableStructure));
		vi.spyOn(tablesService, 'fetchTableWidgets').mockReturnValue(of(tableWidgetsNetwork));

		component.ngOnInit();
		fixture.detectChanges();

		expect(component.connectionID).toEqual('12345678');
		expect(component.tableName).toEqual('Users');
		expect(component.fields).toEqual(['FirstName', 'Id', 'bool']);
		expect(component.widgets).toEqual(tableWidgetsNetwork);
	});

	it('should add new empty widget to widgets array', () => {
		component.widgets = [
			{
				field_name: 'user_id',
				widget_type: 'textarea',
				widget_params: '',
				name: '',
				description: '',
			},
		];

		component.addNewWidget();

		expect(component.widgets).toEqual([
			{
				field_name: 'user_id',
				widget_type: 'textarea',
				widget_params: '',
				name: '',
				description: '',
			},
			{
				field_name: '',
				widget_type: 'Default',
				widget_params: '// No settings required',
				name: '',
				description: '',
			},
		]);
	});

	it('should exclude field from lields list when it is added the list of widgets', () => {
		component.fields = ['user_id', 'first_name', 'last_name', 'email'];
		component.selectWidgetField('first_name');

		expect(component.fields).toEqual(['user_id', 'last_name', 'email']);
	});

	it('should open dialog to confirm deletion of widget', () => {
		component.fields = ['user_age'];
		component.widgets = [
			{
				field_name: 'user_id',
				widget_type: 'textarea',
				widget_params: '',
				name: '',
				description: '',
			},
			{
				field_name: 'user_name',
				widget_type: 'Default',
				widget_params: '',
				name: 'name',
				description: '',
			},
		];

		const fakeDialog = vi.spyOn(dialog, 'open').mockReturnValue(dialogRefSpyObj as any);
		component.openDeleteWidgetDialog('user_name');

		expect(fakeDialog).toHaveBeenCalledWith(WidgetDeleteDialogComponent, {
			width: '25em',
			data: 'user_name',
		});

		expect(component.fields).toEqual(['user_age', 'user_name']);
		expect(component.widgets).toEqual([
			{
				field_name: 'user_id',
				widget_type: 'textarea',
				widget_params: '',
				name: '',
				description: '',
			},
		]);
	});

	it('should update widgets', () => {
		component.connectionID = '12345678';
		component.tableName = 'users';
		component.widgets = [
			{
				field_name: 'email',
				widget_type: 'Textarea',
				widget_params: '',
				name: 'user email',
				description: '',
			},
		];
		const fakeUpdateTableWidgets = vi.spyOn(tablesService, 'updateTableWidgets').mockReturnValue(of());
		// const fakeFatchWidgets = vi.spyOn(tablesService, 'fetchTableWidgets').mockReturnValue(of(tableWidgetsNetwork));

		component.updateWidgets();

		expect(fakeUpdateTableWidgets).toHaveBeenCalledWith('12345678', 'users', [
			{
				field_name: 'email',
				widget_type: 'Textarea',
				widget_params: '',
				name: 'user email',
				description: '',
			},
		]);
		expect(component.submitting).toBe(false);
	});
});
