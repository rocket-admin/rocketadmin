import { provideHttpClient } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { CodeEditorModule } from '@ngstack/code-editor';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { TablesService } from 'src/app/services/tables.service';
import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
import { GroupNameEditDialogComponent } from './group-name-edit-dialog.component';

describe('GroupNameEditDialogComponent', () => {
	let component: GroupNameEditDialogComponent;
	let fixture: ComponentFixture<GroupNameEditDialogComponent>;
	let tablesService: TablesService;

	const mockDialogRef = {
		close: () => {},
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
		TestBed.configureTestingModule({
			imports: [
				MatDialogModule,
				MatSnackBarModule,
				FormsModule,
				BrowserAnimationsModule,
				Angulartics2Module.forRoot({}),
				GroupNameEditDialogComponent,
			],
			providers: [
				provideHttpClient(),
				provideRouter([]),
				{
					provide: MAT_DIALOG_DATA,
					useValue: { id: 'test-id', title: 'Test Group', cedarPolicy: cedarPolicyWithConnection },
				},
				{ provide: MatDialogRef, useValue: mockDialogRef },
			],
		})
			.overrideComponent(GroupNameEditDialogComponent, {
				remove: { imports: [CodeEditorModule] },
				add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] },
			})
			.compileComponents();

		tablesService = TestBed.inject(TablesService);
		vi.spyOn(tablesService, 'fetchTables').mockReturnValue(of(fakeTables));

		fixture = TestBed.createComponent(GroupNameEditDialogComponent);
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
		expect(component.tablesLoading).toBe(false);
	});

	it('should pre-populate policy items from existing cedar policy', () => {
		// The cedar policy has connection:read, so policyItems should contain it
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
