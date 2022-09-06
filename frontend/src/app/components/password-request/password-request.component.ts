import { Component, OnInit } from '@angular/core';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-password-request',
  templateUrl: './password-request.component.html',
  styleUrls: ['./password-request.component.css']
})
export class PasswordRequestComponent implements OnInit {

  public userEmail: string;
  public submitting: boolean;

  constructor(
    private _userService: UserService
  ) { }

  ngOnInit(): void {
  }

  requestPassword() {
    this.submitting = true;
    this._userService.requestPasswordReset(this.userEmail).subscribe(() => {
      this.submitting = false;
    },
    () => this.submitting = false,
    () => this.submitting = false
    );
  }

}
