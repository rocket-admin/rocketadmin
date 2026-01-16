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

		(global.window as any).google = {
			accounts: {
				id: {
					initialize: vi.fn(),
					renderButton: vi.fn(),
					prompt: vi.fn(),
				},
			},
		};
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(LoginComponent);
		component = fixture.componentInstance;
		authService = TestBed.inject(AuthService);
		companyService = TestBed.inject(CompanyService);
		vi.spyOn(companyService, 'isCustomDomain').mockReturnValue(false);
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

		const fakeLoginUser = vi.spyOn(authService, 'loginUser').mockReturnValue(of());

		component.loginUser();
		expect(fakeLoginUser).toHaveBeenCalledWith({
			email: 'john@smith.com',
			password: 'kK123456789',
			companyId: 'company_1',
		});
		expect(component.submitting).toBe(false);
	});
});
