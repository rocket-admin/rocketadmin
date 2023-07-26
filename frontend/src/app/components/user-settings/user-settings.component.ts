import { Alert, AlertActionType, AlertType } from 'src/app/models/alert';
import { Component, Input, OnInit } from '@angular/core';

import { AccountDeleteDialogComponent } from './account-delete-dialog/account-delete-dialog.component';
import { AuthService } from 'src/app/services/auth.service';
import { EnableTwoFADialogComponent } from './enable-two-fa-dialog/enable-two-fa-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { User } from 'src/app/models/user';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-user-settings',
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.css']
})
export class UserSettingsComponent implements OnInit {
  public currentUser: User = null;
  public submittingChangedName: boolean;
  public currentPlan: string;
  public isAnnually: boolean;
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

  constructor(
    private _userService: UserService,
    private _authService: AuthService,
    public dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.currentUser = null;
    this._userService.cast
      .subscribe(user => {
        this.currentUser =user;
        this.userName = user.name;
        this.is2FAEnabledToggle = user.is_2fa_enabled;

        if (user.subscriptionLevel) {
          this.currentPlan = user.subscriptionLevel;

          if (this.currentPlan.startsWith('ANNUAL_')) {
            this.isAnnually = true;
            this.currentPlan = this.currentPlan.substring(7);
          }

          this.currentPlan = this.currentPlan.slice(0, -5).toLowerCase();
        } else {
          this.currentPlan = "free"
        }

      });
  }

  requestEmailVerification() {
    this._authService.requestEmailVerifications().subscribe();
  }

  changeEmail() {
    this._userService.requestEmailChange()
      .subscribe((res) => console.log(res));
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
      },
      () => { this.submittingChangedName = false; },
      () => { this.submittingChangedName = false; }
    )
  }

  switch2FA(event) {
    // let enableTwoFADialog = null;
    console.log('event.checked');
    console.log(event.checked);
    console.log('this.currentUser.is_2fa_enabled');
    console.log(this.currentUser);
    console.log(this.currentUser.is_2fa_enabled);
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
        }
      });
  }

}
