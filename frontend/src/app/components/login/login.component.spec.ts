import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { CompanyService } from 'src/app/services/company.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
	let component: LoginComponent;
	let fixture: ComponentFixture<LoginComponent>;
	let authService: AuthService;
	let companyService: CompanyService;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [
				FormsModule,
				MatSnackBarModule,
				MatIconTestingModule,
				Angulartics2Module.forRoot(),
				LoginComponent,
				BrowserAnimationsModule,
			],
			providers: [provideHttpClient(), provideRouter([])],
		}).compileComponents();

		global.window.google = jasmine.createSpyObj(['accounts']);
		// @ts-expect-error
		global.window.google.accounts = jasmine.createSpyObj(['id']);
		global.window.google.accounts.id = jasmine.createSpyObj(['initialize', 'renderButton', 'prompt']);
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(LoginComponent);
		component = fixture.componentInstance;
		authService = TestBed.inject(AuthService);
		companyService = TestBed.inject(CompanyService);
		spyOn(companyService, 'isCustomDomain').and.returnValue(false);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should login a user', () => {
		component.user = {
			email: 'john@smith.com',
			password: 'kK123456789',
			companyId: 'company_1',
		};

		const fakeLoginUser = spyOn(authService, 'loginUser').and.returnValue(of());

		component.loginUser();
		expect(fakeLoginUser).toHaveBeenCalledOnceWith({
			email: 'john@smith.com',
			password: 'kK123456789',
			companyId: 'company_1',
		});
		expect(component.submitting).toBeFalse();
	});
});
