import { Component, OnInit } from '@angular/core';

import { Angulartics2 } from 'angulartics2';
import { Router } from '@angular/router';
import { User } from 'src/app/models/user';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-password-change',
  templateUrl: './password-change.component.html',
  styleUrls: ['./password-change.component.css']
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
