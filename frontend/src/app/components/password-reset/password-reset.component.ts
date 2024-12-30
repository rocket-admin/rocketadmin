import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';

import { AlertComponent } from '../ui-components/alert/alert.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserPasswordComponent } from '../ui-components/user-password/user-password.component';
import { UserService } from 'src/app/services/user.service';
import { map } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-password-reset',
  templateUrl: './password-reset.component.html',
  styleUrls: ['./password-reset.component.css'],
  imports: [CommonModule, FormsModule, MatButtonModule, AlertComponent, UserPasswordComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PasswordResetComponent implements OnInit {

  public token: string;
  public newPassword: string = '';
  public submitting: boolean;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private _userService: UserService
  ) { }

  ngOnInit(): void {
    this.route.paramMap
    .pipe(
      map((params: ParamMap) => {
        this.token = params.get('verification-token');
      })
    ).subscribe();
  }

  updatePasswordField(updatedValue: string) {
    this.newPassword = updatedValue;
  }

  updatePassword() {
    this._userService.resetPassword(this.token, this.newPassword)
      .subscribe(() => {
        this.router.navigate(['/login'])
      });
  }

}
