import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { SamlConfig } from 'src/app/models/company';
import { CompanyService } from 'src/app/services/company.service';
import { SsoComponent } from './sso.component';

describe('SsoComponent', () => {
	let component: SsoComponent;
	let fixture: ComponentFixture<SsoComponent>;
	let companyServiceSpy: any;

	const mockCompany = {
		id: '123',
		name: 'Test Company',
		address: {},
		portal_link: '',
		subscriptionLevel: 'FREE_PLAN',
		connections: [],
		invitations: [],
		is_payment_method_added: false,
		show_test_connections: false,
	};

	const mockSamlConfig: SamlConfig = {
		name: 'Test SSO',
		entryPoint: 'https://idp.example.com/sso',
		issuer: 'test-issuer',
		callbackUrl: 'https://app.example.com/callback',
		cert: 'test-certificate',
		signatureAlgorithm: 'sha256',
		digestAlgorithm: 'sha256',
		active: true,
		authnResponseSignedValidation: true,
		assertionsSignedValidation: false,
		allowedDomains: ['example.com'],
		displayName: 'Test SSO Provider',
		logoUrl: 'https://example.com/logo.png',
		expectedIssuer: 'expected-issuer',
		slug: 'test-sso',
	};

	beforeEach(async () => {
		companyServiceSpy = {
			fetchCompany: vi.fn().mockReturnValue(of(mockCompany)),
			fetchSamlConfiguration: vi.fn().mockReturnValue(of([])),
			createSamlConfiguration: vi.fn().mockReturnValue(of({})),
			updateSamlConfiguration: vi.fn().mockReturnValue(of({})),
			getCurrentTabTitle: vi.fn().mockReturnValue(of('Rocketadmin')),
		};

		await TestBed.configureTestingModule({
			imports: [SsoComponent, RouterModule.forRoot([])],
			providers: [
				provideHttpClient(),
				{ provide: CompanyService, useValue: companyServiceSpy },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(SsoComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should set company from fetchCompany', () => {
		expect(component.company).toEqual(mockCompany);
	});

	it('should fetch SAML configuration on init', () => {
		expect(companyServiceSpy.fetchSamlConfiguration).toHaveBeenCalledWith('123');
	});

	it('should set samlConfig when configuration exists', () => {
		companyServiceSpy.fetchSamlConfiguration.mockReturnValue(of([mockSamlConfig]));

		component.ngOnInit();

		expect(component.samlConfig).toEqual(mockSamlConfig);
	});

	it('should keep initial config when no configuration exists', () => {
		companyServiceSpy.fetchSamlConfiguration.mockReturnValue(of([]));

		component.ngOnInit();

		expect(component.samlConfig.name).toBe('');
		expect(component.samlConfig.active).toBe(true);
	});

	it('should have correct initial SAML config values', () => {
		expect(component.samlConfigInitial.digestAlgorithm).toBe('sha256');
		expect(component.samlConfigInitial.active).toBe(true);
		expect(component.samlConfigInitial.authnResponseSignedValidation).toBe(false);
		expect(component.samlConfigInitial.assertionsSignedValidation).toBe(false);
	});

	it('should create SAML configuration', () => {
		component.samlConfig = mockSamlConfig;

		component.createSamlConfiguration();

		expect(companyServiceSpy.createSamlConfiguration).toHaveBeenCalledWith('123', mockSamlConfig);
		expect(component.submitting).toBe(false);
		expect(component.saved).toBe(true);
	});

	it('should update SAML configuration', () => {
		component.samlConfig = mockSamlConfig;

		component.updateSamlConfiguration();

		expect(companyServiceSpy.updateSamlConfiguration).toHaveBeenCalledWith(mockSamlConfig);
		expect(component.submitting).toBe(false);
		expect(component.saved).toBe(true);
	});

	it('should initialize with submitting as false', () => {
		expect(component.submitting).toBe(false);
	});
});
