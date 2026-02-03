import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { EmailValidationDirective } from 'src/app/directives/emailValidator.directive';
import { SelfhostedService } from 'src/app/services/selfhosted.service';
import { AlertComponent } from '../ui-components/alert/alert.component';
import { UserPasswordComponent } from '../ui-components/user-password/user-password.component';

@Component({
	selector: 'app-setup',
	templateUrl: './setup.component.html',
	styleUrls: ['./setup.component.css'],
	imports: [
		CommonModule,
		FormsModule,
		MatFormFieldModule,
		MatInputModule,
		MatButtonModule,
		EmailValidationDirective,
		AlertComponent,
		UserPasswordComponent,
	],
})
export class SetupComponent {
	private _selfhostedService = inject(SelfhostedService);
	private _router = inject(Router);

	protected email = signal('');
	protected password = signal('');
	protected submitting = signal(false);

	onEmailChange(value: string): void {
		this.email.set(value);
	}

	onPasswordChange(value: string): void {
		this.password.set(value);
	}

	createAdminAccount(): void {
		if (!this.email() || !this.password()) {
			return;
		}

		this.submitting.set(true);

		this._selfhostedService
			.createInitialUser({
				email: this.email(),
				password: this.password(),
			})
			.subscribe({
				next: () => {
					this.submitting.set(false);
					this._router.navigate(['/login']);
				},
				error: () => {
					this.submitting.set(false);
				},
				complete: () => {
					this.submitting.set(false);
				},
			});
	}
}
