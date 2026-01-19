import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { UserService } from 'src/app/services/user.service';
import { EmailChangeComponent } from './email-change.component';

describe('EmailChangeComponent', () => {
	let component: EmailChangeComponent;
	let fixture: ComponentFixture<EmailChangeComponent>;
	let userService: UserService;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MatSnackBarModule, FormsModule, EmailChangeComponent, BrowserAnimationsModule],
			providers: [provideHttpClient(), provideRouter([])],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(EmailChangeComponent);
		component = fixture.componentInstance;
		userService = TestBed.inject(UserService);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should update email', () => {
		component.token = '12345678';
		component.newEmail = 'new@email.com';
		const fakeUpdateEmail = vi.spyOn(userService, 'changeEmail').mockReturnValue(of());

		component.updateEmail();
		expect(fakeUpdateEmail).toHaveBeenCalledWith('12345678', 'new@email.com');
	});
});
