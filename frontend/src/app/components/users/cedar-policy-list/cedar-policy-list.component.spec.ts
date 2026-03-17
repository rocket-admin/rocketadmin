import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CedarPolicyListComponent } from './cedar-policy-list.component';

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
		await TestBed.configureTestingModule({
			imports: [CedarPolicyListComponent, FormsModule, BrowserAnimationsModule],
		}).compileComponents();

		fixture = TestBed.createComponent(CedarPolicyListComponent);
		component = fixture.componentInstance;
		component.availableTables = fakeTables;
		component.availableDashboards = fakeDashboards;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should add a policy', () => {
		const emitSpy = vi.spyOn(component.policiesChange, 'emit');
		component.showAddForm = true;
		component.newAction = 'connection:read';
		component.addPolicy();

		expect(component.policies.length).toBe(1);
		expect(component.policies[0].action).toBe('connection:read');
		expect(emitSpy).toHaveBeenCalled();
		expect(component.showAddForm).toBe(false);
	});

	it('should add a table policy with tableName', () => {
		component.showAddForm = true;
		component.newAction = 'table:read';
		component.newTableName = 'customers';
		component.addPolicy();

		expect(component.policies.length).toBe(1);
		expect(component.policies[0].action).toBe('table:read');
		expect(component.policies[0].tableName).toBe('customers');
	});

	it('should add a table policy with wildcard tableName', () => {
		component.showAddForm = true;
		component.newAction = 'table:edit';
		component.newTableName = '*';
		component.addPolicy();

		expect(component.policies.length).toBe(1);
		expect(component.policies[0].action).toBe('table:edit');
		expect(component.policies[0].tableName).toBe('*');
	});

	it('should not add policy without action', () => {
		component.showAddForm = true;
		component.newAction = '';
		component.addPolicy();

		expect(component.policies.length).toBe(0);
	});

	it('should not add table policy without table name', () => {
		component.showAddForm = true;
		component.newAction = 'table:read';
		component.newTableName = '';
		component.addPolicy();

		expect(component.policies.length).toBe(0);
	});

	it('should remove a policy', () => {
		component.policies = [{ action: 'connection:read' }, { action: 'group:read' }];
		const emitSpy = vi.spyOn(component.policiesChange, 'emit');

		component.removePolicy(0);

		expect(component.policies.length).toBe(1);
		expect(component.policies[0].action).toBe('group:read');
		expect(emitSpy).toHaveBeenCalled();
	});

	it('should start and save edit', () => {
		component.policies = [{ action: 'connection:read' }];
		const emitSpy = vi.spyOn(component.policiesChange, 'emit');

		component.startEdit(0);
		expect(component.editingIndex).toBe(0);
		expect(component.editAction).toBe('connection:read');

		component.editAction = 'connection:edit';
		component.saveEdit(0);

		expect(component.policies[0].action).toBe('connection:edit');
		expect(component.editingIndex).toBeNull();
		expect(emitSpy).toHaveBeenCalled();
	});

	it('should cancel edit', () => {
		component.policies = [{ action: 'connection:read' }];
		component.startEdit(0);
		component.editAction = 'connection:edit';
		component.cancelEdit();

		expect(component.editingIndex).toBeNull();
		expect(component.policies[0].action).toBe('connection:read');
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
		component.showAddForm = true;
		component.newAction = 'connection:read';
		component.newTableName = 'test';
		component.resetAddForm();

		expect(component.showAddForm).toBe(false);
		expect(component.newAction).toBe('');
		expect(component.newTableName).toBe('');
	});

	it('should add a dashboard policy with dashboardId', () => {
		component.showAddForm = true;
		component.newAction = 'dashboard:read';
		component.newDashboardId = 'dash-1';
		component.addPolicy();

		expect(component.policies.length).toBe(1);
		expect(component.policies[0].action).toBe('dashboard:read');
		expect(component.policies[0].dashboardId).toBe('dash-1');
	});

	it('should not add dashboard policy without dashboard id', () => {
		component.showAddForm = true;
		component.newAction = 'dashboard:edit';
		component.newDashboardId = '';
		component.addPolicy();

		expect(component.policies.length).toBe(0);
	});

	it('should detect needsDashboard correctly', () => {
		component.newAction = 'connection:read';
		expect(component.needsDashboard).toBe(false);

		component.newAction = 'dashboard:read';
		expect(component.needsDashboard).toBe(true);
	});

	it('should return correct dashboard display names', () => {
		expect(component.getDashboardDisplayName('dash-1')).toBe('Sales Dashboard');
		expect(component.getDashboardDisplayName('unknown')).toBe('unknown');
		expect(component.getDashboardDisplayName('__new__')).toBe('New dashboards');
	});
});
