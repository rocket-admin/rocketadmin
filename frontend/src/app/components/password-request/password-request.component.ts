import { Component, OnInit } from '@angular/core';

import { AlertComponent } from '../ui-components/alert/alert.component';
import { AuthService } from 'src/app/services/auth.service';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmailValidationDirective } from 'src/app/directives/emailValidator.directive';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-password-request',
  templateUrl: './password-request.component.html',
  styleUrls: ['./password-request.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    EmailValidationDirective,
    AlertComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
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
