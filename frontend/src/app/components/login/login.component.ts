import { AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, Component, NgZone, OnInit } from '@angular/core';
import { AlertActionType, AlertType } from 'src/app/models/alert';

import { Angulartics2 } from 'angulartics2';
import { AuthService } from 'src/app/services/auth.service';
import { CommonModule } from '@angular/common';
import { ExistingAuthUser } from 'src/app/models/user';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { NotificationsService } from 'src/app/services/notifications.service';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { accounts } from 'google-one-tap';
import { environment } from 'src/environments/environment';

declare var google: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatIconModule,
    MatButtonModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LoginComponent implements OnInit, AfterViewInit {

  public isSaas = (environment as any).saas;
  public user: ExistingAuthUser = {
    email: '',
    password: '',
    companyId: ''
  };
  public userCompanies: [] = null;
  public isLoadingUserCompanies: boolean = false;
  public authCode: string;
  public submitting: boolean;
  public isPasswordFieldShown: boolean = false;
  public is2FAShown: boolean = false;
  public errors = {
    'No_user_registered_with_this_GitHub_account.': 'No user registered with this GitHub account.',
    'GitHub_login_failed._Please_contact_our_support_team.': 'GitHub login failed. Please contact our support team.'
  }

  constructor(
    private _auth: AuthService,
    public router: Router,
    private angulartics2: Angulartics2,
    private ngZone: NgZone,
    private _notifications: NotificationsService,
  ) { }

  ngOnInit(): void {
    const error = new URLSearchParams(location.search).get('error');
    if (error) this._notifications.showAlert(AlertType.Error, this.errors[error] || error, [
      {
        type: AlertActionType.Button,
        caption: 'Dismiss',
        action: (id: number) => this._notifications.dismissAlert()
      }
    ]);
  }

  ngAfterViewInit() {
    const gAccounts: accounts = google.accounts;
    gAccounts.id.initialize({
      client_id: "681163285738-e4l0lrv5vv7m616ucrfhnhso9r396lum.apps.googleusercontent.com",
      callback: (authUser) => {
        this.ngZone.run(() => {
          this._auth.loginWithGoogle(authUser.credential).subscribe((res) => {
            if (res.isTemporary) this.is2FAShown = true;
            this.angulartics2.eventTrack.next({
              action: 'Login: google login success'
            });
          });
        })
      }
    });
    gAccounts.id.renderButton(
       document.getElementById("google_login_button"),
       { theme: "outline", size: "large", width: 360, text: "continue_with" }
    );
    gAccounts.id.prompt();
  }

  requestUserCompanies() {
    this.isLoadingUserCompanies = true;
    this._auth.fetchUserCompanies(this.user.email)
      .subscribe(companies => {
        this.angulartics2.eventTrack.next({
          action: 'Login: companies is received',
          properties: {
            count: companies.length
          }
        })

        this.userCompanies = companies;
        this.isLoadingUserCompanies = false;

        if (companies.length === 1) {
          this.isPasswordFieldShown = true;
          this.user.companyId = companies[0].id;
        }
      });
  }

  loginUser() {
    this.submitting = true;
    this._auth.loginUser(this.user)
      .subscribe((res) => {
        this.submitting = false;
        if (res.isTemporary) this.is2FAShown = true;
        this.angulartics2.eventTrack.next({
          action: 'Login: login success'
        });
      }, (error) => {
        this.angulartics2.eventTrack.next({
          action: 'Login: login unsuccessful'
        });
        this.submitting = false;
      }, () => this.submitting = false)
  }

  loginWithGithub() {
    this._auth.loginWithGithub();
    this.angulartics2.eventTrack.next({
      action: 'Login: github login redirect'
    });
  }

  loginWith2FA() {
    this.submitting = true;
    this._auth.loginWith2FA(this.authCode)
      .subscribe(() => {
        this.submitting = false;
        this.angulartics2.eventTrack.next({
          action: 'Login: login with 2fa success'
        });
      }, (error) => {
        this.angulartics2.eventTrack.next({
          action: 'Login: login with 2fa unsuccessful'
        });
        this.submitting = false;
      }, () => this.submitting = false)
  }
}
