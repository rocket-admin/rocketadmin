import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { IPasswordStrengthMeterService } from 'angular-password-strength-meter';
import { Angulartics2Module } from 'angulartics2';
import { PasswordResetComponent } from './password-reset.component';

describe('PasswordResetComponent', () => {
	let component: PasswordResetComponent;
	let fixture: ComponentFixture<PasswordResetComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [
				MatSnackBarModule,
				FormsModule,
				PasswordResetComponent,
				BrowserAnimationsModule,
				Angulartics2Module.forRoot({}),
			],
			providers: [provideHttpClient(), provideRouter([]), { provide: IPasswordStrengthMeterService, useValue: {} }],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(PasswordResetComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
