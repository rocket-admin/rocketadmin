import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CompanyMemberRole } from 'src/app/models/company';
import { User } from 'src/app/models/user';
import { CompanyService } from 'src/app/services/company.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { HostedDatabaseService } from 'src/app/services/hosted-database.service';
import { NotificationsService } from 'src/app/services/notifications.service';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { OwnConnectionsComponent } from './own-connections.component';

describe('OwnConnectionsComponent', () => {
	let component: OwnConnectionsComponent;
	let fixture: ComponentFixture<OwnConnectionsComponent>;
	let hostedDatabaseService: {
		createHostedDatabase: ReturnType<typeof vi.fn>;
	};
	let connectionsService: {
		fetchConnections: ReturnType<typeof vi.fn>;
	};
	let dialog: {
		open: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		hostedDatabaseService = {
			createHostedDatabase: vi.fn(),
		};
		connectionsService = {
			fetchConnections: vi.fn().mockReturnValue(of([])),
		};
		dialog = {
			open: vi.fn(),
		};

		await TestBed.configureTestingModule({
			imports: [OwnConnectionsComponent],
			providers: [
				provideHttpClient(),
				provideRouter([]),
				{
					provide: UiSettingsService,
					useValue: {
						isDarkMode: false,
						getUiSettings: vi.fn().mockReturnValue(of({ globalSettings: { connectionsListCollapsed: true } })),
						updateGlobalSetting: vi.fn(),
					},
				},
				{
					provide: CompanyService,
					useValue: {
						fetchCompanyMembers: vi.fn().mockReturnValue(of([])),
					},
				},
				{
					provide: ConnectionsService,
					useValue: connectionsService,
				},
				{
					provide: HostedDatabaseService,
					useValue: hostedDatabaseService,
				},
				{
					provide: NotificationsService,
					useValue: {
						showSuccessSnackbar: vi.fn(),
						showAlert: vi.fn(),
						dismissAlert: vi.fn(),
					},
				},
				{
					provide: MatDialog,
					useValue: dialog,
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(OwnConnectionsComponent);
		component = fixture.componentInstance;
		component.connections = [];
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should show hosted database CTA for SaaS admins', () => {
		component.isSaas = true;
		component.currentUser = {
			id: 'user-id',
			role: CompanyMemberRole.CAO,
			company: { id: 'company-id' },
		} as User;

		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('[data-testid="create-hosted-database-empty-button"]')).toBeTruthy();
	});

	it('should hide hosted database CTA for non-admin users', () => {
		component.isSaas = true;
		component.currentUser = {
			id: 'user-id',
			role: CompanyMemberRole.Member,
			company: { id: 'company-id' },
		} as User;

		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('[data-testid="create-hosted-database-empty-button"]')).toBeFalsy();
	});

	it('should provision a hosted database and open the success dialog', async () => {
		hostedDatabaseService.createHostedDatabase.mockResolvedValue({
			id: 'hosted-db-id',
			companyId: 'company-id',
			databaseName: 'rocketadmin_hosted',
			hostname: 'db.rocketadmin.com',
			port: 5432,
			username: 'postgres',
			password: 'secret',
			createdAt: '2026-03-18T00:00:00.000Z',
		});
		component.currentUser = {
			id: 'user-id',
			role: CompanyMemberRole.CAO,
			company: { id: 'company-id' },
		} as User;

		await component.createHostedDatabase();

		expect(hostedDatabaseService.createHostedDatabase).toHaveBeenCalledWith('company-id');
		expect(connectionsService.fetchConnections).toHaveBeenCalled();
		expect(dialog.open).toHaveBeenCalled();
	});
});
