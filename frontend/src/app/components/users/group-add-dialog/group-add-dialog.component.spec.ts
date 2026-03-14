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
import { UsersService } from 'src/app/services/users.service';
import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
import { GroupAddDialogComponent } from './group-add-dialog.component';

describe('GroupAddDialogComponent', () => {
	let component: GroupAddDialogComponent;
	let fixture: ComponentFixture<GroupAddDialogComponent>;
	let usersService: UsersService;
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

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [
				MatSnackBarModule,
				FormsModule,
				MatDialogModule,
				Angulartics2Module.forRoot({}),
				GroupAddDialogComponent,
				BrowserAnimationsModule,
			],
			providers: [
				provideHttpClient(),
				provideRouter([]),
				{ provide: MAT_DIALOG_DATA, useValue: {} },
				{ provide: MatDialogRef, useValue: mockDialogRef },
			],
		})
			.overrideComponent(GroupAddDialogComponent, {
				remove: { imports: [CodeEditorModule] },
				add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] },
			})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(GroupAddDialogComponent);
		component = fixture.componentInstance;
		usersService = TestBed.inject(UsersService);
		tablesService = TestBed.inject(TablesService);
		vi.spyOn(tablesService, 'fetchTables').mockReturnValue(of(fakeTables));
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should call create user group service', () => {
		component.groupTitle = 'Sellers';
		component.connectionID = '12345678';
		const fakeCreateUsersGroup = vi.spyOn(usersService, 'createUsersGroup').mockReturnValue(of());
		vi.spyOn(mockDialogRef, 'close');

		component.addGroup();

		expect(fakeCreateUsersGroup).toHaveBeenCalledWith('12345678', 'Sellers', null);
		expect(component.submitting).toBe(false);
	});

	it('should load tables on init', () => {
		expect(tablesService.fetchTables).toHaveBeenCalled();
		expect(component.allTables.length).toBe(2);
		expect(component.availableTables.length).toBe(2);
		expect(component.tablesLoading).toBe(false);
	});

	it('should start in form mode', () => {
		expect(component.editorMode).toBe('form');
	});

	it('should switch to code mode and generate cedar policy from policy items', () => {
		component.policyItems = [{ action: 'connection:read' }, { action: 'group:edit' }];

		component.onEditorModeChange('code');

		expect(component.editorMode).toBe('code');
		expect(component.cedarPolicy).toContain('connection:read');
		expect(component.cedarPolicy).toContain('group:edit');
	});

	it('should switch back to form mode and parse cedar policy into items', () => {
		component.connectionID = 'test-conn';
		component.cedarPolicy = `permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"test-conn"\n);`;

		component.onEditorModeChange('code');
		component.onEditorModeChange('form');

		expect(component.editorMode).toBe('form');
	});

	it('should add and remove policy items', () => {
		component.onPolicyItemsChange([{ action: '*' }]);
		expect(component.policyItems.length).toBe(1);
		expect(component.policyItems[0].action).toBe('*');

		component.onPolicyItemsChange([]);
		expect(component.policyItems.length).toBe(0);
	});
});
