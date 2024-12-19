import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit } from '@angular/core';

import { AlertComponent } from '../ui-components/alert/alert.component';
import { Angulartics2 } from 'angulartics2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { User } from 'src/app/models/user';
import { UserPasswordComponent } from '../ui-components/user-password/user-password.component';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-password-change',
  templateUrl: './password-change.component.html',
  styleUrls: ['./password-change.component.css'],
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, AlertComponent, UserPasswordComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PasswordChangeComponent implements OnInit {

  public currentUser: User = null;
  public oldPassword: string = '';
  public newPassword: string = '';
  public submitting: boolean = false;

  constructor(
    private _userService: UserService,
    public router: Router,
    private angulartics2: Angulartics2,
  ) { }

  ngOnInit(): void {
    this._userService.cast.subscribe(user => this.currentUser = user);
  }

  updatePasswordField(updatedValue: string) {
    this.newPassword = updatedValue;
  }

  updatePassword() {
    this.submitting = true;
    this._userService.changePassword(this.oldPassword, this.newPassword, this.currentUser.email)
      .subscribe(() => {
          this.submitting = false;
          this.angulartics2.eventTrack.next({
            action: 'Manual password change: password updated successfully',
          });
          this.router.navigate(['/user-settings']);
        },
        undefined,
        () => this.submitting = false
      );
  }

}
