import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CompanyService } from 'src/app/services/company.service';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { OwnConnectionsComponent } from './own-connections.component';

describe('OwnConnectionsComponent', () => {
	let component: OwnConnectionsComponent;
	let fixture: ComponentFixture<OwnConnectionsComponent>;

	beforeEach(async () => {
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
});
