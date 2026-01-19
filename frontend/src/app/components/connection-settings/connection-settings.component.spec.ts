import { provideHttpClient } from '@angular/common/http';
import { forwardRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { ConnectionSettings } from 'src/app/models/connection';
import { ConnectionsService } from 'src/app/services/connections.service';
import { TablesService } from 'src/app/services/tables.service';
import { ConnectionSettingsComponent } from './connection-settings.component';

describe('ConnectionSettingsComponent', () => {
	let component: ConnectionSettingsComponent;
	let fixture: ComponentFixture<ConnectionSettingsComponent>;
	let tablesService: TablesService;
	let connectionsService: ConnectionsService;

	const mockTablesList = [
		{
			table: 'customer',
			permissions: {
				visibility: true,
				readonly: false,
				add: true,
				delete: true,
				edit: true,
			},
		},
		{
			table: 'Orders',
			permissions: {
				visibility: true,
				readonly: false,
				add: true,
				delete: true,
				edit: true,
			},
			display_name: 'Created orders',
		},
		{
			table: 'product',
			permissions: {
				visibility: true,
				readonly: false,
				add: true,
				delete: true,
				edit: true,
			},
		},
	];

	const mockConnectionSettings: ConnectionSettings = {
		primary_color: '#1F5CB8',
		secondary_color: '#F9D648',
		logo_url: 'https://www.shutterstock.com/image-vector/abstract-yellow-grunge-texture-isolated-260nw-1981157192.jpg',
		company_name: 'Such.Ukr.Lit',
		hidden_tables: ['writer_info', 'address'],
		tables_audit: false,
		default_showing_table: 'customer',
	};

	const mockConnectionSettingsResponse = {
		id: '98a20557-6b38-46aa-b09b-d8a716421dd6',
		connectionId: '63f804e4-8588-4957-8d7f-655e2309fef7',
		...mockConnectionSettings,
	};

	beforeEach(async () => {
		const matSnackBarSpy = { open: vi.fn() };

		await TestBed.configureTestingModule({
			imports: [
				MatSnackBarModule,
				MatDialogModule,
				FormsModule,
				MatSelectModule,
				BrowserAnimationsModule,
				Angulartics2Module.forRoot(),
				ConnectionSettingsComponent,
			],
			providers: [
				provideHttpClient(),
				provideRouter([]),
				{
					provide: NG_VALUE_ACCESSOR,
					useExisting: forwardRef(() => ConnectionSettingsComponent),
					multi: true,
				},
				{ provide: MatSnackBar, useValue: matSnackBarSpy },
			],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ConnectionSettingsComponent);
		component = fixture.componentInstance;
		tablesService = TestBed.inject(TablesService);
		connectionsService = TestBed.inject(ConnectionsService);
		vi.spyOn(connectionsService, 'currentConnectionID', 'get').mockReturnValue('12345678');
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should set table list', () => {
		const fakeFetchTables = vi.spyOn(tablesService, 'fetchTables').mockReturnValue(of(mockTablesList));

		component.ngOnInit();
		fixture.detectChanges();

		expect(fakeFetchTables).toHaveBeenCalledWith('12345678', true);
		expect(component.tablesList).toEqual([
			{
				table: 'customer',
				permissions: {
					visibility: true,
					readonly: false,
					add: true,
					delete: true,
					edit: true,
				},
				normalizedTableName: 'Customers',
			},
			{
				table: 'Orders',
				permissions: {
					visibility: true,
					readonly: false,
					add: true,
					delete: true,
					edit: true,
				},
				display_name: 'Created orders',
			},
			{
				table: 'product',
				permissions: {
					visibility: true,
					readonly: false,
					add: true,
					delete: true,
					edit: true,
				},
				normalizedTableName: 'Products',
			},
		]);
	});

	it('should show error if db is empty', () => {
		const fakeFetchTables = vi.spyOn(tablesService, 'fetchTables').mockReturnValue(of([]));

		component.ngOnInit();
		fixture.detectChanges();

		expect(fakeFetchTables).toHaveBeenCalledWith('12345678', true);
		expect(component.noTablesError).toBe(true);
	});

	it('should set table settings if they are existed', () => {
		const fakeGetSettings = vi
			.spyOn(connectionsService, 'getConnectionSettings')
			.mockReturnValue(of(mockConnectionSettingsResponse));

		component.getSettings();

		expect(fakeGetSettings).toHaveBeenCalledWith('12345678');
		expect(component.connectionSettings).toEqual(mockConnectionSettingsResponse);
		expect(component.isSettingsExist).toBe(true);
	});

	it('should set empty settings if they are not existed', () => {
		const fakeGetSettings = vi.spyOn(connectionsService, 'getConnectionSettings').mockReturnValue(of(null));

		component.getSettings();

		expect(fakeGetSettings).toHaveBeenCalledWith('12345678');
		expect(component.connectionSettings).toEqual({
			hidden_tables: [],
			default_showing_table: null,
			primary_color: '',
			secondary_color: '',
			logo_url: '',
			company_name: '',
			tables_audit: true,
		});
		expect(component.isSettingsExist).toBe(false);
	});

	it('should create settings', () => {
		component.connectionSettings = mockConnectionSettings;
		const fakeCreateSettings = vi.spyOn(connectionsService, 'createConnectionSettings').mockReturnValue(of());

		component.createSettings();

		expect(fakeCreateSettings).toHaveBeenCalledWith('12345678', {
			primary_color: '#1F5CB8',
			secondary_color: '#F9D648',
			logo_url:
				'https://www.shutterstock.com/image-vector/abstract-yellow-grunge-texture-isolated-260nw-1981157192.jpg',
			company_name: 'Such.Ukr.Lit',
			hidden_tables: ['writer_info', 'address'],
			default_showing_table: 'customer',
			tables_audit: false,
		});
		expect(component.submitting).toBe(false);
	});

	it('should update settings', () => {
		component.connectionSettings = mockConnectionSettings;
		const fakeUpdateSettings = vi.spyOn(connectionsService, 'updateConnectionSettings').mockReturnValue(of());

		component.updateSettings();

		expect(fakeUpdateSettings).toHaveBeenCalledWith('12345678', {
			primary_color: '#1F5CB8',
			secondary_color: '#F9D648',
			logo_url:
				'https://www.shutterstock.com/image-vector/abstract-yellow-grunge-texture-isolated-260nw-1981157192.jpg',
			company_name: 'Such.Ukr.Lit',
			hidden_tables: ['writer_info', 'address'],
			default_showing_table: 'customer',
			tables_audit: false,
		});
		expect(component.submitting).toBe(false);
	});

	it('should reset settings', () => {
		const fakeDeleteSettings = vi.spyOn(connectionsService, 'deleteConnectionSettings').mockReturnValue(of());

		component.resetSettings();

		expect(fakeDeleteSettings).toHaveBeenCalledWith('12345678');
		expect(component.submitting).toBe(false);
	});
});
