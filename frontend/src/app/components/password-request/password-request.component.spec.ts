import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { UserService } from 'src/app/services/user.service';
import { PasswordRequestComponent } from './password-request.component';

describe('PasswordRequestComponent', () => {
	let component: PasswordRequestComponent;
	let fixture: ComponentFixture<PasswordRequestComponent>;
	let userService: UserService;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [RouterTestingModule, FormsModule, MatSnackBarModule, PasswordRequestComponent, BrowserAnimationsModule],
			providers: [provideHttpClient()],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(PasswordRequestComponent);
		component = fixture.componentInstance;
		userService = TestBed.inject(UserService);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should create', () => {
		component.userEmail = 'eric@cartman.ass';
		component.companyId = 'company_1111';
		const fakePasswordReset = vi.spyOn(userService, 'requestPasswordReset').mockReturnValue(of());

		component.requestPassword();

		expect(fakePasswordReset).toHaveBeenCalledWith('eric@cartman.ass', 'company_1111');
	});
});
