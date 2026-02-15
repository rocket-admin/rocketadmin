import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { Angulartics2, Angulartics2Module, Angulartics2OnModule } from 'angulartics2';
import posthog from 'posthog-js';
import { Alert, AlertActionType, AlertType } from 'src/app/models/alert';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { CompanyService } from 'src/app/services/company.service';
import { UserService } from 'src/app/services/user.service';
import { ProfileSidebarComponent } from '../profile/profile-sidebar/profile-sidebar.component';
import { AlertComponent } from '../ui-components/alert/alert.component';
import { AccountDeleteDialogComponent } from './account-delete-dialog/account-delete-dialog.component';
import { EnableTwoFADialogComponent } from './enable-two-fa-dialog/enable-two-fa-dialog.component';

@Component({
	selector: 'app-user-settings',
	templateUrl: './user-settings.component.html',
	styleUrls: ['./user-settings.component.css'],
	imports: [
		CommonModule,
		FormsModule,
		RouterModule,
		MatButtonModule,
		MatDialogModule,
		MatFormFieldModule,
		MatIconModule,
		MatInputModule,
		MatSlideToggleModule,
		MatTooltipModule,
		Angulartics2Module,
		AlertComponent,
		Angulartics2OnModule,
		ProfileSidebarComponent,
	],
})
export class UserSettingsComponent implements OnInit {
	protected posthog = posthog;
	public currentUser: User = null;
	public submittingChangedName: boolean;
	public userName: string;
	public submittingChangedShowTestConnections: boolean;
	public showTestConnections: 'on' | 'off';
	public emailVerificationWarning: Alert = {
		id: 10000001,
		type: AlertType.Warning,
		message: 'Your email address is not confirmed. Please check your email or resend confirmation.',
		actions: [
			{
				type: AlertActionType.Button,
				caption: 'Resend confirmation',
				action: () => this.requestEmailVerification(),
			},
		],
	};

	public authProviderIcons = {
		GOOGLE: 'google',
		GITHUB: 'github',
	};

	public authCode: string;
	public is2FAswitchingOffSettingsShown: boolean = false;
	public is2FAEnabledToggle: boolean;

	public isDemoAccountWarning: Alert = {
		id: 10000000,
		type: AlertType.Warning,
		message: 'This is a DEMO SESSION! Once you log out, all changes made will be lost.',
	};

	constructor(
		private _userService: UserService,
		private _authService: AuthService,
		private _company: CompanyService,
		public dialog: MatDialog,
		private title: Title,
		private angulartics2: Angulartics2,
	) {}

	get isDemo() {
		return this._userService.isDemo;
	}

	ngOnInit(): void {
		this.title.setTitle(`Account settings | ${this._company.companyTabTitle || 'Rocketadmin'}`);
		this.currentUser = null;
		this._userService.cast.subscribe((user) => {
			this.currentUser = user;
			this.userName = user.name;
			this.is2FAEnabledToggle = user.is_2fa_enabled;
			this.showTestConnections = user.show_test_connections;
		});
	}

	requestEmailVerification() {
		this._authService.requestEmailVerifications().subscribe();
	}

	changeEmail() {
		this._userService.requestEmailChange().subscribe((res) => {
			this.angulartics2.eventTrack.next({
				action: 'User settings: email change request is sent successfully',
			});
			posthog.capture('User settings: email change request is sent successfully');
			console.log(res);
		});
	}

	confirmDeleteAccount() {
		// event.preventDefault();
		// event.stopImmediatePropagation();
		this.dialog.open(AccountDeleteDialogComponent, {
			width: '32em',
			data: this.currentUser,
		});
	}

	changeUserName() {
		this.submittingChangedName = true;
		this._userService.changeUserName(this.userName).subscribe(
			(_res) => {
				this.submittingChangedName = false;
				this.angulartics2.eventTrack.next({
					action: 'User settings: user name is updated successfully',
				});
				posthog.capture('User settings: user name is updated successfully');
			},
			() => {
				this.submittingChangedName = false;
			},
			() => {
				this.submittingChangedName = false;
			},
		);
	}

	switch2FA(event) {
		if (event.checked && !this.currentUser.is_2fa_enabled) {
			this._userService.switchOn2FA().subscribe((res) => {
				const enableTwoFADialog = this.dialog.open(EnableTwoFADialogComponent, {
					width: '32em',
					data: res.qrCode,
				});

				enableTwoFADialog.afterClosed().subscribe((action) => {
					if (action !== 'enable') {
						this.is2FAEnabledToggle = false;
					}
				});

				enableTwoFADialog.componentInstance.confirm2FAerror.subscribe((result: boolean) => {
					if (result) {
						this.is2FAEnabledToggle = false;
					}
				});
			});
		} else if (event.checked && this.currentUser.is_2fa_enabled) {
			this.is2FAswitchingOffSettingsShown = false;
		} else {
			this.is2FAswitchingOffSettingsShown = true;
		}
	}

	switchOff2FA() {
		this._userService.switchOff2FA(this.authCode).subscribe((res) => {
			if (res.disabled) {
				this.is2FAswitchingOffSettingsShown = false;
				this.authCode = '';
				this.angulartics2.eventTrack.next({
					action: 'User settings: 2fa disabled successfully',
				});
				posthog.capture('User settings: 2fa disabled successfully');
			}
		});
	}

	changeShowTestConnections(checked: boolean) {
		const displayMode = checked ? 'on' : 'off';
		this.submittingChangedShowTestConnections = true;
		this._userService.updateShowTestConnections(displayMode).subscribe(() => {
			this.submittingChangedShowTestConnections = false;
			this.angulartics2.eventTrack.next({
				action: 'Company: show test connections is updated successfully',
			});
			posthog.capture('Company: show test connections is updated successfully');
		});
	}
}
