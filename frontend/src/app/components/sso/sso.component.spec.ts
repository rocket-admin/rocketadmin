import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { SamlConfig } from 'src/app/models/company';
import { CompanyService } from 'src/app/services/company.service';
import { SsoComponent } from './sso.component';

describe('SsoComponent', () => {
	let component: SsoComponent;
	let fixture: ComponentFixture<SsoComponent>;
	let companyServiceSpy: any;
	let mockRouter: any;

	const mockActivatedRoute = {
		snapshot: {
			paramMap: convertToParamMap({
				'company-id': '123',
			}),
		},
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
		mockRouter = {
			routerState: {
				snapshot: {
					root: {
						firstChild: {
							params: {
								'company-id': '123',
							},
						},
					},
				},
			},
			navigate: vi.fn(),
			events: of(null),
			url: '/company',
			createUrlTree: vi.fn().mockReturnValue({}),
			serializeUrl: vi.fn().mockReturnValue('company'),
		};

		companyServiceSpy = {
			fetchSamlConfiguration: vi.fn().mockReturnValue(of([])),
			createSamlConfiguration: vi.fn().mockReturnValue(of({})),
			updateSamlConfiguration: vi.fn().mockReturnValue(of({})),
		};

		await TestBed.configureTestingModule({
			imports: [SsoComponent, HttpClientTestingModule, RouterModule.forRoot([])],
			providers: [
				{ provide: ActivatedRoute, useValue: mockActivatedRoute },
				{ provide: Router, useValue: mockRouter },
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

	it('should initialize company ID from router state', () => {
		expect(component.companyId).toBe('123');
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

	it('should create SAML configuration and navigate to company', () => {
		component.samlConfig = mockSamlConfig;

		component.createSamlConfiguration();

		expect(component.submitting).toBe(false);
		expect(companyServiceSpy.createSamlConfiguration).toHaveBeenCalledWith('123', mockSamlConfig);
		expect(mockRouter.navigate).toHaveBeenCalledWith(['/company']);
	});

	it('should set submitting to true while creating configuration', () => {
		companyServiceSpy.createSamlConfiguration.mockReturnValue(of({}));

		component.createSamlConfiguration();

		// After subscription completes, submitting should be false
		expect(component.submitting).toBe(false);
	});

	it('should update SAML configuration and navigate to company', () => {
		component.samlConfig = mockSamlConfig;

		component.updateSamlConfiguration();

		expect(component.submitting).toBe(false);
		expect(companyServiceSpy.updateSamlConfiguration).toHaveBeenCalledWith(mockSamlConfig);
		expect(mockRouter.navigate).toHaveBeenCalledWith(['/company']);
	});

	it('should initialize with submitting as false', () => {
		expect(component.submitting).toBe(false);
	});
});
