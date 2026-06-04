import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PolicyAction, PolicyActionGroup } from 'src/app/lib/cedar-policy-items';
import { UsersService } from 'src/app/services/users.service';
import { CedarPolicyListComponent } from './cedar-policy-list.component';

const fixtureGroups: PolicyActionGroup[] = [
	{
		group: 'Connection',
		actions: [
			{ value: 'connection:read', resource: 'connection' },
			{ value: 'connection:edit', resource: 'connection' },
		],
	},
	{
		group: 'Group',
		actions: [
			{ value: 'group:read', resource: 'group' },
			{ value: 'group:edit', resource: 'group' },
		],
	},
	{
		group: 'Table',
		actions: [
			{ value: 'table:read', resource: 'table' },
			{ value: 'table:edit', resource: 'table' },
		],
	},
	{
		group: 'Dashboard',
		actions: [
			{ value: 'dashboard:read', resource: 'dashboard' },
			{ value: 'dashboard:create', resource: 'dashboard' },
			{ value: 'dashboard:edit', resource: 'dashboard' },
		],
	},
];

const flatActions: PolicyAction[] = fixtureGroups.flatMap((g) => g.actions);

describe('CedarPolicyListComponent', () => {
	let component: CedarPolicyListComponent;
	let fixture: ComponentFixture<CedarPolicyListComponent>;

	const fakeTables = [
		{ tableName: 'customers', displayName: 'Customers' },
		{ tableName: 'orders', displayName: 'Orders' },
	];

	const fakeDashboards = [
		{ id: 'dash-1', name: 'Sales Dashboard' },
		{ id: 'dash-2', name: 'Analytics' },
	];

	beforeEach(async () => {
		const groupsSignal = signal(fixtureGroups);
		const actionsSignal = signal(flatActions);
		const mockUsersService: Partial<UsersService> = {
			availablePermissionGroups: groupsSignal.asReadonly() as UsersService['availablePermissionGroups'],
			availablePermissions: actionsSignal.asReadonly() as UsersService['availablePermissions'],
		};

		await TestBed.configureTestingModule({
			imports: [CedarPolicyListComponent, FormsModule, BrowserAnimationsModule],
			providers: [{ provide: UsersService, useValue: mockUsersService }],
		}).compileComponents();

		fixture = TestBed.createComponent(CedarPolicyListComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('availableTables', fakeTables);
		fixture.componentRef.setInput('availableDashboards', fakeDashboards);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should add a policy', () => {
		let emitted: { action: string; tableName?: string; dashboardId?: string }[] | null = null;
		component.policiesChange.subscribe((v) => (emitted = v));

		component.showAddForm.set(true);
		component.newAction = 'connection:read';
		component.addPolicy();

		expect(emitted).not.toBeNull();
		expect(emitted!.length).toBe(1);
		expect(emitted![0].action).toBe('connection:read');
		expect(component.showAddForm()).toBe(false);
	});

	it('should add a table policy with tableName', () => {
		let emitted: { action: string; tableName?: string; dashboardId?: string }[] | null = null;
		component.policiesChange.subscribe((v) => (emitted = v));

		component.showAddForm.set(true);
		component.newAction = 'table:read';
		component.newTableName = 'customers';
		component.addPolicy();

		expect(emitted!.length).toBe(1);
		expect(emitted![0].action).toBe('table:read');
		expect(emitted![0].tableName).toBe('customers');
	});

	it('should add a table policy with wildcard tableName', () => {
		let emitted: { action: string; tableName?: string; dashboardId?: string }[] | null = null;
		component.policiesChange.subscribe((v) => (emitted = v));

		component.showAddForm.set(true);
		component.newAction = 'table:edit';
		component.newTableName = '*';
		component.addPolicy();

		expect(emitted!.length).toBe(1);
		expect(emitted![0].action).toBe('table:edit');
		expect(emitted![0].tableName).toBe('*');
	});

	it('should not add policy without action', () => {
		let emitted = false;
		component.policiesChange.subscribe(() => (emitted = true));

		component.showAddForm.set(true);
		component.newAction = '';
		component.addPolicy();

		expect(emitted).toBe(false);
	});

	it('should not add table policy without table name', () => {
		let emitted = false;
		component.policiesChange.subscribe(() => (emitted = true));

		component.showAddForm.set(true);
		component.newAction = 'table:read';
		component.newTableName = '';
		component.addPolicy();

		expect(emitted).toBe(false);
	});

	it('should remove a policy', () => {
		fixture.componentRef.setInput('policies', [{ action: 'connection:read' }, { action: 'group:read' }]);
		fixture.detectChanges();

		let emitted: { action: string; tableName?: string; dashboardId?: string }[] | null = null;
		component.policiesChange.subscribe((v) => (emitted = v));

		component.removePolicy(0);

		expect(emitted!.length).toBe(1);
		expect(emitted![0].action).toBe('group:read');
	});

	it('should start and save edit', () => {
		fixture.componentRef.setInput('policies', [{ action: 'connection:read' }]);
		fixture.detectChanges();

		let emitted: { action: string; tableName?: string; dashboardId?: string }[] | null = null;
		component.policiesChange.subscribe((v) => (emitted = v));

		component.startEdit(0);
		expect(component.editingIndex).toBe(0);
		expect(component.editAction).toBe('connection:read');

		component.editAction = 'connection:edit';
		component.saveEdit(0);

		expect(emitted![0].action).toBe('connection:edit');
		expect(component.editingIndex).toBeNull();
	});

	it('should cancel edit', () => {
		fixture.componentRef.setInput('policies', [{ action: 'connection:read' }]);
		fixture.detectChanges();

		component.startEdit(0);
		component.editAction = 'connection:edit';
		component.cancelEdit();

		expect(component.editingIndex).toBeNull();
		expect(component.policies()[0].action).toBe('connection:read');
	});

	it('should return correct action labels', () => {
		expect(component.getActionLabel('*')).toBe('Full access (all permissions)');
		expect(component.getActionLabel('connection:read')).toBe('Connection read');
		expect(component.getActionLabel('table:edit')).toBe('Table edit');
		expect(component.getActionLabel('table:*')).toBe('Full table access');
	});

	it('should return correct table display names', () => {
		expect(component.getTableDisplayName('customers')).toBe('Customers');
		expect(component.getTableDisplayName('unknown')).toBe('unknown');
		expect(component.getTableDisplayName('*')).toBe('All tables');
	});

	it('should detect needsTable correctly', () => {
		component.newAction = 'connection:read';
		expect(component.needsTable).toBe(false);

		component.newAction = 'table:read';
		expect(component.needsTable).toBe(true);

		component.newAction = 'table:*';
		expect(component.needsTable).toBe(true);
	});

	it('should reset add form', () => {
		component.showAddForm.set(true);
		component.newAction = 'connection:read';
		component.newTableName = 'test';
		component.resetAddForm();

		expect(component.showAddForm()).toBe(false);
		expect(component.newAction).toBe('');
		expect(component.newTableName).toBe('');
	});

	it('should add a dashboard policy with dashboardId', () => {
		let emitted: { action: string; tableName?: string; dashboardId?: string }[] | null = null;
		component.policiesChange.subscribe((v) => (emitted = v));

		component.showAddForm.set(true);
		component.newAction = 'dashboard:read';
		component.newDashboardId = 'dash-1';
		component.addPolicy();

		expect(emitted!.length).toBe(1);
		expect(emitted![0].action).toBe('dashboard:read');
		expect(emitted![0].dashboardId).toBe('dash-1');
	});

	it('should not add dashboard policy without dashboard id', () => {
		let emitted = false;
		component.policiesChange.subscribe(() => (emitted = true));

		component.showAddForm.set(true);
		component.newAction = 'dashboard:edit';
		component.newDashboardId = '';
		component.addPolicy();

		expect(emitted).toBe(false);
	});

	it('should detect needsDashboard correctly', () => {
		component.newAction = 'connection:read';
		expect(component.needsDashboard).toBe(false);

		component.newAction = 'dashboard:read';
		expect(component.needsDashboard).toBe(true);
	});

	it('should treat dashboard:create as scopeless', () => {
		component.newAction = 'dashboard:create';
		expect(component.needsDashboard).toBe(false);
	});

	it('should return correct dashboard display names', () => {
		expect(component.getDashboardDisplayName('dash-1')).toBe('Sales Dashboard');
		expect(component.getDashboardDisplayName('unknown')).toBe('unknown');
		expect(component.getDashboardDisplayName('*')).toBe('All dashboards');
	});

	it('should synthesize General and prefix wildcards in addActionGroups', () => {
		const testable = component as CedarPolicyListComponent & {
			addActionGroups: () => PolicyActionGroup[];
		};
		const groups = testable.addActionGroups();
		const general = groups.find((g) => g.group === 'General');
		expect(general).toBeTruthy();
		expect(general!.actions[0].value).toBe('*');

		const table = groups.find((g) => g.group === 'Table');
		expect(table).toBeTruthy();
		expect(table!.actions[0].value).toBe('table:*');
		expect(table!.actions[0].resource).toBe('table');

		const dashboard = groups.find((g) => g.group === 'Dashboard');
		expect(dashboard).toBeTruthy();
		expect(dashboard!.actions[0].value).toBe('dashboard:*');

		const connection = groups.find((g) => g.group === 'Connection');
		expect(connection!.actions[0].value).toBe('connection:read');
	});
});
