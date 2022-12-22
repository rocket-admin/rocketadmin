import { Alert, AlertActionType, AlertType } from 'src/app/models/alert';
import { Component, Input, OnInit } from '@angular/core';

import { AccountDeleteDialogComponent } from './account-delete-dialog/account-delete-dialog.component';
import { AuthService } from 'src/app/services/auth.service';
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
  public submittingDelete: boolean;
  public currentPlan: string;
  public isAnnually: boolean;
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
  };

  constructor(
    private _userService: UserService,
    private _authService: AuthService,
    public dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.currentUser = null;
    this._userService.cast
      .subscribe(user => {
        this.currentUser = user;

        if (user.subscriptionLevel) {
          this.currentPlan = user.subscriptionLevel;

          if (this.currentPlan.startsWith('ANNUAL_')) {
            this.isAnnually = true;
            this.currentPlan = this.currentPlan.substring(7);
          }

          this.currentPlan = this.currentPlan.slice(0, -5).toLowerCase();
        } else {
          this.currentPlan = "Free"
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
}
