import { Alert, AlertActionType, AlertType } from 'src/app/models/alert';
import { Component, Input, OnInit } from '@angular/core';

import { AccountDeleteDialogComponent } from './account-delete-dialog/account-delete-dialog.component';
import { Angulartics2 } from 'angulartics2';
import { AuthService } from 'src/app/services/auth.service';
import { EnableTwoFADialogComponent } from './enable-two-fa-dialog/enable-two-fa-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ApiKey, User } from 'src/app/models/user';
import { UserService } from 'src/app/services/user.service';
import { NotificationsService } from 'src/app/services/notifications.service';
import { ApiKeyDeleteDialogComponent } from './api-key-delete-dialog/api-key-delete-dialog.component';

@Component({
  selector: 'app-user-settings',
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.css']
})
export class UserSettingsComponent implements OnInit {
  public currentUser: User = null;
  public submittingChangedName: boolean;
  public userName: string;
  public emailVerificationWarning: Alert = {
    id: 10000001,
    type: AlertType.Warning,
    message: 'Your email address is not confirmed. Please check your email or resend confirmation.',
    actions: [
      {
        type: AlertActionType.Button,
        caption: 'Resend confirmation',
        action: () => this.requestEmailVerification()
      }
    ]
  }

  public authCode: string;
  public is2FAswitchingOffSettingsShown: boolean = false;
  public is2FAEnabledToggle: boolean;

  public apiKeys: [];
  public generatingAPIkeyTitle: string;
  public generatedAPIkeyHash: string;

  constructor(
    private _userService: UserService,
    private _authService: AuthService,
    private _notifications: NotificationsService,
    public dialog: MatDialog,
    private angulartics2: Angulartics2,
  ) {}

  ngOnInit(): void {
    this.currentUser = null;
    this._userService.cast
      .subscribe(user => {
        this.currentUser =user;
        this.userName = user.name;
        this.is2FAEnabledToggle = user.is_2fa_enabled;
      });
    this.getAPIkeys();
  }

  requestEmailVerification() {
    this._authService.requestEmailVerifications().subscribe();
  }

  changeEmail() {
    this._userService.requestEmailChange()
      .subscribe((res) => {
        this.angulartics2.eventTrack.next({
          action: 'User settings: email change request is sent successfully',
        });
        console.log(res)
      });
  }

  confirmDeleteAccount() {
    // event.preventDefault();
    // event.stopImmediatePropagation();
    this.dialog.open(AccountDeleteDialogComponent, {
      width: '32em',
      data: this.currentUser
    });
  }

  changeUserName() {
    this.submittingChangedName = true;
    this._userService.changeUserName(this.userName)
      .subscribe((res) => {
        this.submittingChangedName = false;
        this.angulartics2.eventTrack.next({
          action: 'User settings: user name is updated successfully',
        });
      },
      () => { this.submittingChangedName = false; },
      () => { this.submittingChangedName = false; }
    )
  }

  switch2FA(event) {
    if (event.checked && !this.currentUser.is_2fa_enabled) {
      this._userService.switchOn2FA()
        .subscribe((res) => {
          const enableTwoFADialog = this.dialog.open(EnableTwoFADialogComponent, {
            width: '32em',
            data: res.qrCode
          });

          enableTwoFADialog.afterClosed().subscribe(action => {
            if (action !== 'enable') {
              this.is2FAEnabledToggle = false;
            }
          });

          enableTwoFADialog.componentInstance.confirm2FAerror.subscribe((result: boolean) => {
            if (result) {
              this.is2FAEnabledToggle = false;
            }
          })
        });
    } else if (event.checked && this.currentUser.is_2fa_enabled) {
      this.is2FAswitchingOffSettingsShown = false;
    } else {
      this.is2FAswitchingOffSettingsShown = true;
    }
  }

  switchOff2FA() {
    this._userService.switchOff2FA(this.authCode)
      .subscribe((res) => {
        if (res.disabled) {
          this.is2FAswitchingOffSettingsShown = false;
          this.authCode = '';
          this.angulartics2.eventTrack.next({
            action: 'User settings: 2fa disabled successfully',
          });
        }
      });
  }

  getAPIkeys() {
    this._userService.getAPIkeys().subscribe(res => this.apiKeys = res);
  }

  generateAPIkey() {
    this._userService.generateAPIkey(this.generatingAPIkeyTitle).subscribe(res => {
      this.generatedAPIkeyHash = res.hash;
      this.getAPIkeys();
    });
  }

  deleteAPIkey(apiKey: ApiKey) {
    const deleteConfirmation = this.dialog.open(ApiKeyDeleteDialogComponent, {
      width: '25em',
      data: apiKey
    });

    deleteConfirmation.afterClosed().subscribe( action => {
      if (action === 'delete') this.getAPIkeys();
    });
  }

  showCopyNotification(message: string) {
    this._notifications.showSuccessSnackbar(message);
  }
}
