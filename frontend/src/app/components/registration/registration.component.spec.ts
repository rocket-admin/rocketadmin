import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { IPasswordStrengthMeterService } from 'angular-password-strength-meter';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { RegistrationComponent } from './registration.component';

describe('RegistrationComponent', () => {
	let component: RegistrationComponent;
	let fixture: ComponentFixture<RegistrationComponent>;
	let authService: AuthService;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [
				FormsModule,
				MatSnackBarModule,
				MatIconTestingModule,
				Angulartics2Module.forRoot(),
				BrowserAnimationsModule,
				RegistrationComponent,
			],
			providers: [provideHttpClient(), provideRouter([]), { provide: IPasswordStrengthMeterService, useValue: {} }],
		}).compileComponents();

		// @ts-expect-error
		global.window.gtag = vi.fn();

		(global.window as any).google = {
			accounts: {
				id: {
					initialize: vi.fn(),
					renderButton: vi.fn(),
					prompt: vi.fn(),
				},
			},
		};

		// Mock Turnstile
		window.turnstile = {
			render: vi.fn().mockReturnValue('mock-widget-id'),
			reset: vi.fn(),
			getResponse: vi.fn(),
			remove: vi.fn(),
		};
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(RegistrationComponent);
		component = fixture.componentInstance;
		authService = TestBed.inject(AuthService);
		fixture.detectChanges();
	});

	afterEach(() => {
		delete window.turnstile;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should sign a user in without turnstile token when not SaaS', () => {
		component.isSaas = false;
		component.user = {
			email: 'john@smith.com',
			password: 'kK123456789',
		};

		const fakeSignUpUser = vi.spyOn(authService, 'signUpUser').mockReturnValue(of());

		component.registerUser();
		expect(fakeSignUpUser).toHaveBeenCalledWith({
			email: 'john@smith.com',
			password: 'kK123456789',
		});
		expect(component.submitting).toBe(false);
	});

	it('should include turnstile token in registration request when SaaS', () => {
		component.isSaas = true;
		component.user = {
			email: 'john@smith.com',
			password: 'kK123456789',
		};
		component.turnstileToken = 'test-turnstile-token';

		const fakeSignUpUser = vi.spyOn(authService, 'signUpUser').mockReturnValue(of());

		component.registerUser();
		expect(fakeSignUpUser).toHaveBeenCalledWith({
			email: 'john@smith.com',
			password: 'kK123456789',
			turnstileToken: 'test-turnstile-token',
		});
	});

	it('should set turnstileToken when onTurnstileToken is called', () => {
		component.onTurnstileToken('new-token');
		expect(component.turnstileToken).toBe('new-token');
	});

	it('should clear turnstileToken when onTurnstileError is called', () => {
		component.turnstileToken = 'existing-token';
		component.onTurnstileError();
		expect(component.turnstileToken).toBeNull();
	});

	it('should clear turnstileToken when onTurnstileExpired is called', () => {
		component.turnstileToken = 'existing-token';
		component.onTurnstileExpired();
		expect(component.turnstileToken).toBeNull();
	});
});
