import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';

import { UserService } from 'src/app/services/user.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-password-change',
  templateUrl: './password-change.component.html',
  styleUrls: ['./password-change.component.css']
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
