import { Component, OnInit } from '@angular/core';

import { AuthService } from 'src/app/services/auth.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-password-request',
  templateUrl: './password-request.component.html',
  styleUrls: ['./password-request.component.css']
})
export class PasswordRequestComponent implements OnInit {

  public userEmail: string;
  public companyId: string;
  public submitting: boolean;
  public isLoadingUserCompanies: boolean = false;
  public userCompanies: [] = null;

  constructor(
    private _userService: UserService,
    private _auth: AuthService,
  ) { }

  ngOnInit(): void {
  }

  requestUserCompanies() {
    this.isLoadingUserCompanies = true;
    this._auth.fetchUserCompanies(this.userEmail)
      .subscribe(companies => {
        this.userCompanies = companies;
        this.isLoadingUserCompanies = false;

        if (companies.length === 1) {
          this.companyId = companies[0].id;
        }
      });
  }

  requestPassword() {
    this.submitting = true;
    this._userService.requestPasswordReset(this.userEmail, this.companyId).subscribe(() => {
      this.submitting = false;
    },
    () => this.submitting = false,
    () => this.submitting = false
    );
  }

}
