import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { IPasswordStrengthMeterService } from 'angular-password-strength-meter';
import { Angulartics2Module } from 'angulartics2';
import { SelfhostedService } from 'src/app/services/selfhosted.service';
import { SetupComponent } from './setup.component';

type SetupComponentTestable = SetupComponent & {
	email: ReturnType<typeof import('@angular/core').signal<string>>;
	password: ReturnType<typeof import('@angular/core').signal<string>>;
	submitting: ReturnType<typeof import('@angular/core').signal<boolean>>;
};

describe('SetupComponent', () => {
	let component: SetupComponent;
	let fixture: ComponentFixture<SetupComponent>;
	let selfhostedService: SelfhostedService;
	let router: Router;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [FormsModule, MatSnackBarModule, SetupComponent, BrowserAnimationsModule, Angulartics2Module.forRoot()],
			providers: [provideHttpClient(), provideRouter([]), { provide: IPasswordStrengthMeterService, useValue: {} }],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(SetupComponent);
		component = fixture.componentInstance;
		selfhostedService = TestBed.inject(SelfhostedService);
		router = TestBed.inject(Router);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should update email signal on change', () => {
		const testable = component as SetupComponentTestable;
		component.onEmailChange('test@example.com');
		expect(testable.email()).toBe('test@example.com');
	});

	it('should update password signal on change', () => {
		const testable = component as SetupComponentTestable;
		component.onPasswordChange('SecurePass123');
		expect(testable.password()).toBe('SecurePass123');
	});

	it('should not submit if email is empty', async () => {
		const testable = component as SetupComponentTestable;
		const fakeCreateInitialUser = vi.spyOn(selfhostedService, 'createInitialUser');

		testable.email.set('');
		testable.password.set('SecurePass123');

		await component.createAdminAccount();
		expect(fakeCreateInitialUser).not.toHaveBeenCalled();
	});

	it('should not submit if password is empty', async () => {
		const testable = component as SetupComponentTestable;
		const fakeCreateInitialUser = vi.spyOn(selfhostedService, 'createInitialUser');

		testable.email.set('test@example.com');
		testable.password.set('');

		await component.createAdminAccount();
		expect(fakeCreateInitialUser).not.toHaveBeenCalled();
	});

	it('should create admin account and navigate to login on success', async () => {
		const testable = component as SetupComponentTestable;
		const fakeCreateInitialUser = vi.spyOn(selfhostedService, 'createInitialUser').mockResolvedValue({ success: true });
		const fakeNavigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

		testable.email.set('admin@example.com');
		testable.password.set('SecurePass123');

		await component.createAdminAccount();

		expect(fakeCreateInitialUser).toHaveBeenCalledWith({
			email: 'admin@example.com',
			password: 'SecurePass123',
		});
		expect(testable.submitting()).toBe(false);
		expect(fakeNavigate).toHaveBeenCalledWith(['/login']);
	});
});
