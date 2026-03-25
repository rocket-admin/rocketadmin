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
import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
import { CedarPolicyEditorDialogComponent } from './cedar-policy-editor-dialog.component';

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
		expect(tablesService.fetchTables).toHaveBeenCalled();
		expect(component.allTables.length).toBe(2);
		expect(component.availableTables.length).toBe(2);
		expect(component.loading).toBe(false);
	});

	it('should pre-populate policy items from existing cedar policy', () => {
		expect(component.policyItems.length).toBeGreaterThan(0);
		expect(component.policyItems.some((item) => item.action === 'connection:read')).toBe(true);
	});

	it('should start in form mode', () => {
		expect(component.editorMode).toBe('form');
	});

	it('should switch to code mode', () => {
		component.onEditorModeChange('code');
		expect(component.editorMode).toBe('code');
		expect(component.cedarPolicy).toBeTruthy();
	});
});
