import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { IPasswordStrengthMeterService } from 'angular-password-strength-meter';
import { Angulartics2Module } from 'angulartics2';
import { CompanyMemberInvitationComponent } from './company-member-invitation.component';

describe('CompanyMemberInvitationComponent', () => {
	let component: CompanyMemberInvitationComponent;
	let fixture: ComponentFixture<CompanyMemberInvitationComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MatSnackBarModule, Angulartics2Module.forRoot(), CompanyMemberInvitationComponent],
			providers: [provideHttpClient(), provideRouter([]), { provide: IPasswordStrengthMeterService, useValue: {} }],
		}).compileComponents();

		fixture = TestBed.createComponent(CompanyMemberInvitationComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
