import { Signal, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { PublicPermissions } from 'src/app/models/user';
import { ConnectionsService } from 'src/app/services/connections.service';
import { TablesService } from 'src/app/services/tables.service';
import { UsersService } from 'src/app/services/users.service';
import { PublicAccessPanelComponent } from './public-access-panel.component';

type PublicAccessPanelTestable = PublicAccessPanelComponent & {
	statusLabel: Signal<string>;
	selectedCount: Signal<number>;
	canDisable: Signal<boolean>;
	tablesLoading: WritableSignal<boolean>;
	submitting: WritableSignal<boolean>;
	tables: Signal<Array<{ tableName: string; displayName: string }>>;
};

const CONNECTION_ID = '5a2d4e0c-6d3a-4b0f-9d1a-4a0f0a4c8b11';

const fakeTables = [
	{ table: 'customers', display_name: 'Customers' },
	{ table: 'orders', display_name: '' },
];

const fakeStructure = {
	structure: [{ column_name: 'id' }, { column_name: 'name' }, { column_name: 'secret' }],
};

describe('PublicAccessPanelComponent', () => {
	let component: PublicAccessPanelComponent;
	let testable: PublicAccessPanelTestable;
	let fixture: ComponentFixture<PublicAccessPanelComponent>;
	let publicPermissions: WritableSignal<PublicPermissions>;
	let mockUsersService: Partial<UsersService>;
	let mockTablesService: Partial<TablesService>;

	beforeEach(async () => {
		publicPermissions = signal<PublicPermissions>({ enabled: false, tables: [] });

		mockUsersService = {
			publicPermissions: publicPermissions.asReadonly(),
			publicPermissionsLoading: signal(false).asReadonly(),
			loadPublicPermissions: vi.fn(),
			savePublicPermissions: vi.fn().mockResolvedValue(undefined),
		};

		mockTablesService = {
			fetchTables: vi.fn().mockReturnValue(of(fakeTables)),
			fetchTableStructure: vi.fn().mockReturnValue(of(fakeStructure)),
		};

		const mockConnectionsService: Partial<ConnectionsService> = {
			get currentConnectionID() {
				return CONNECTION_ID;
			},
		};

		await TestBed.configureTestingModule({
			imports: [BrowserAnimationsModule, PublicAccessPanelComponent],
			providers: [
				{ provide: UsersService, useValue: mockUsersService },
				{ provide: TablesService, useValue: mockTablesService },
				{ provide: ConnectionsService, useValue: mockConnectionsService },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(PublicAccessPanelComponent);
		component = fixture.componentInstance;
		testable = component as PublicAccessPanelTestable;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should opt in to loading public permissions for this connection on init', () => {
		expect(mockUsersService.loadPublicPermissions).toHaveBeenCalledWith(CONNECTION_ID);
	});

	it('should load the connection tables and fall back to a normalized display name', () => {
		expect(mockTablesService.fetchTables).toHaveBeenCalledWith(CONNECTION_ID);
		expect(testable.tablesLoading()).toBe(false);
		expect(testable.tables()).toEqual([
			{ tableName: 'customers', displayName: 'Customers' },
			{ tableName: 'orders', displayName: 'Orders' },
		]);
	});

	it('should report disabled status when nothing is selected', () => {
		expect(testable.selectedCount()).toBe(0);
		expect(testable.statusLabel()).toBe('Disabled');
		expect(testable.canDisable()).toBe(false);
	});

	it('should seed selection and columns from the stored permissions', () => {
		publicPermissions.set({
			enabled: true,
			tables: [{ tableName: 'customers', readableColumns: ['id', 'name'] }, { tableName: 'orders' }],
		});
		fixture.detectChanges();

		expect(component.isSelected('customers')).toBe(true);
		expect(component.selectedColumns('customers')).toEqual(['id', 'name']);
		expect(component.isSelected('orders')).toBe(true);
		expect(component.selectedColumns('orders')).toEqual([]);
		expect(testable.statusLabel()).toBe('2 tables');
		expect(testable.canDisable()).toBe(true);
	});

	it('should preload columns for every stored table, restricted or not', () => {
		publicPermissions.set({
			enabled: true,
			tables: [{ tableName: 'customers', readableColumns: ['id'] }, { tableName: 'orders' }],
		});
		fixture.detectChanges();

		// An unrestricted table still renders the column picker, so it needs its options too.
		expect(mockTablesService.fetchTableStructure).toHaveBeenCalledWith(CONNECTION_ID, 'customers');
		expect(mockTablesService.fetchTableStructure).toHaveBeenCalledWith(CONNECTION_ID, 'orders');
		expect(component.availableColumns('orders')).toEqual(['id', 'name', 'secret']);
	});

	it('should singularize the status label for one table', () => {
		publicPermissions.set({ enabled: true, tables: [{ tableName: 'customers' }] });
		fixture.detectChanges();

		expect(testable.statusLabel()).toBe('1 table');
	});

	it('should fetch columns lazily when a table is checked', () => {
		component.toggleTable('customers', true);

		expect(mockTablesService.fetchTableStructure).toHaveBeenCalledWith(CONNECTION_ID, 'customers');
		expect(component.availableColumns('customers')).toEqual(['id', 'name', 'secret']);
		expect(component.isLoadingColumns('customers')).toBe(false);
	});

	it('should not refetch columns for a table already loaded', () => {
		component.toggleTable('customers', true);
		component.toggleTable('customers', false);
		component.toggleTable('customers', true);

		expect(mockTablesService.fetchTableStructure).toHaveBeenCalledTimes(1);
	});

	it('should save an empty column selection as undefined readableColumns', async () => {
		component.toggleTable('customers', true);
		await component.save();

		expect(mockUsersService.savePublicPermissions).toHaveBeenCalledWith(CONNECTION_ID, [
			{ tableName: 'customers', readableColumns: undefined },
		]);
	});

	it('should save an explicit column whitelist', async () => {
		component.toggleTable('customers', true);
		component.setColumns('customers', ['id', 'name']);
		await component.save();

		expect(mockUsersService.savePublicPermissions).toHaveBeenCalledWith(CONNECTION_ID, [
			{ tableName: 'customers', readableColumns: ['id', 'name'] },
		]);
	});

	it('should drop a table from the payload when unchecked', async () => {
		component.toggleTable('customers', true);
		component.toggleTable('orders', true);
		component.toggleTable('customers', false);
		await component.save();

		expect(mockUsersService.savePublicPermissions).toHaveBeenCalledWith(CONNECTION_ID, [
			{ tableName: 'orders', readableColumns: undefined },
		]);
	});

	it('should clear the loading state when the table list fails to load', () => {
		mockTablesService.fetchTables = vi.fn().mockReturnValue(throwError(() => new Error('boom')));

		const failing = TestBed.createComponent(PublicAccessPanelComponent);
		failing.detectChanges();

		expect((failing.componentInstance as PublicAccessPanelTestable).tablesLoading()).toBe(false);
	});

	it('should block editing while a save is in flight', async () => {
		let resolveSave: () => void = () => {};
		mockUsersService.savePublicPermissions = vi
			.fn()
			.mockReturnValue(new Promise<void>((resolve) => (resolveSave = resolve)));

		component.toggleTable('customers', true);
		const saving = component.save();
		fixture.detectChanges();

		// The re-seed after reload can only discard an edit made in this window, so it is closed off.
		expect((component as PublicAccessPanelTestable).submitting()).toBe(true);
		const host: HTMLElement = fixture.nativeElement;
		fixture.nativeElement.querySelector('mat-expansion-panel-header').click();
		fixture.detectChanges();
		await fixture.whenStable();
		expect(host.querySelector('mat-checkbox input')?.hasAttribute('disabled')).toBe(true);

		resolveSave();
		await saving;
		expect((component as PublicAccessPanelTestable).submitting()).toBe(false);
	});

	it('should render the table list and column picker once expanded', async () => {
		publicPermissions.set({ enabled: true, tables: [{ tableName: 'customers', readableColumns: ['id'] }] });
		fixture.detectChanges();

		// The body lives in an ng-template matExpansionPanelContent, so nothing above renders it.
		fixture.nativeElement.querySelector('mat-expansion-panel-header').click();
		fixture.detectChanges();
		await fixture.whenStable();

		const host: HTMLElement = fixture.nativeElement;
		expect(host.querySelector('.public-access-warning')).toBeTruthy();
		expect(host.querySelectorAll('.public-access-table').length).toBe(2);
		expect(host.textContent).toContain('Customers');
		expect(host.textContent).toContain('Orders');
		// Only the selected table exposes a column picker.
		expect(host.querySelectorAll('.public-access-columns').length).toBe(1);
		expect(host.textContent).toContain('Disable public access');
	});

	it('should disable public access by saving an empty table list', async () => {
		publicPermissions.set({ enabled: true, tables: [{ tableName: 'customers' }] });
		fixture.detectChanges();

		await component.disablePublicAccess();

		expect(mockUsersService.savePublicPermissions).toHaveBeenCalledWith(CONNECTION_ID, []);
		expect(testable.selectedCount()).toBe(0);
	});
});
