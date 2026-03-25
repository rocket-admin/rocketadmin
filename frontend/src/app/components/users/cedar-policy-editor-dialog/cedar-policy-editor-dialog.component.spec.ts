import { provideHttpClient } from '@angular/common/http';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { CodeEditorModule } from '@ngstack/code-editor';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { DashboardsService } from 'src/app/services/dashboards.service';
import { TablesService } from 'src/app/services/tables.service';
import { UsersService } from 'src/app/services/users.service';
import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
import { CedarPolicyEditorDialogComponent } from './cedar-policy-editor-dialog.component';

type CedarPolicyEditorTestable = CedarPolicyEditorDialogComponent & {
	// biome-ignore lint/suspicious/noExplicitAny: test helper type for accessing protected signals
	allTables: ReturnType<typeof signal<any[]>>;
	// biome-ignore lint/suspicious/noExplicitAny: test helper type for accessing protected signals
	availableTables: ReturnType<typeof signal<any[]>>;
	loading: ReturnType<typeof signal<boolean>>;
	// biome-ignore lint/suspicious/noExplicitAny: test helper type for accessing protected signals
	policyItems: ReturnType<typeof signal<any[]>>;
	editorMode: ReturnType<typeof signal<string>>;
	cedarPolicy: ReturnType<typeof signal<string>>;
};

describe('CedarPolicyEditorDialogComponent', () => {
	let component: CedarPolicyEditorDialogComponent;
	let fixture: ComponentFixture<CedarPolicyEditorDialogComponent>;
	let tablesService: TablesService;
	let dashboardsService: Partial<DashboardsService>;

	const mockDialogRef = {
		close: () => {},
		backdropClick: () => of(),
		keydownEvents: () => of(),
		disableClose: false,
	};

	const fakeTables = [
		{
			table: 'customers',
			display_name: 'Customers',
			permissions: { visibility: true, readonly: false, add: true, delete: true, edit: true },
		},
		{
			table: 'orders',
			display_name: 'Orders',
			permissions: { visibility: true, readonly: false, add: true, delete: false, edit: true },
		},
	];

	const cedarPolicyWithConnection = [
		'permit(',
		'  principal,',
		'  action == RocketAdmin::Action::"connection:read",',
		'  resource == RocketAdmin::Connection::"conn-123"',
		');',
	].join('\n');

	const mockUsersService: Partial<UsersService> = {
		saveCedarPolicy: vi.fn().mockResolvedValue(undefined),
	};

	beforeEach(() => {
		dashboardsService = {
			dashboards: signal([
				{ id: 'dash-1', name: 'Sales', description: null, connection_id: 'conn-123', created_at: '', updated_at: '' },
			]).asReadonly(),
			setActiveConnection: vi.fn(),
		};

		TestBed.configureTestingModule({
			imports: [
				MatDialogModule,
				MatSnackBarModule,
				BrowserAnimationsModule,
				Angulartics2Module.forRoot({}),
				CedarPolicyEditorDialogComponent,
			],
			providers: [
				provideHttpClient(),
				provideRouter([]),
				{
					provide: MAT_DIALOG_DATA,
					useValue: { groupId: 'group-123', groupTitle: 'Test Group', cedarPolicy: cedarPolicyWithConnection },
				},
				{ provide: MatDialogRef, useValue: mockDialogRef },
				{ provide: DashboardsService, useValue: dashboardsService },
				{ provide: UsersService, useValue: mockUsersService },
			],
		})
			.overrideComponent(CedarPolicyEditorDialogComponent, {
				remove: { imports: [CodeEditorModule] },
				add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] },
			})
			.compileComponents();

		tablesService = TestBed.inject(TablesService);
		vi.spyOn(tablesService, 'fetchTables').mockReturnValue(of(fakeTables));

		fixture = TestBed.createComponent(CedarPolicyEditorDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should load tables on init', () => {
		const testable = component as unknown as CedarPolicyEditorTestable;
		expect(tablesService.fetchTables).toHaveBeenCalled();
		expect(testable.allTables().length).toBe(2);
		expect(testable.availableTables().length).toBe(2);
		expect(testable.loading()).toBe(false);
	});

	it('should pre-populate policy items from existing cedar policy', () => {
		const testable = component as unknown as CedarPolicyEditorTestable;
		expect(testable.policyItems().length).toBeGreaterThan(0);
		expect(testable.policyItems().some((item) => item.action === 'connection:read')).toBe(true);
	});

	it('should start in form mode', () => {
		const testable = component as unknown as CedarPolicyEditorTestable;
		expect(testable.editorMode()).toBe('form');
	});

	it('should switch to code mode', () => {
		const testable = component as unknown as CedarPolicyEditorTestable;
		component.onEditorModeChange('code');
		expect(testable.editorMode()).toBe('code');
		expect(testable.cedarPolicy()).toBeTruthy();
	});
});
