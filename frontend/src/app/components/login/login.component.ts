import { Component, NgZone, OnInit } from '@angular/core';

import { Angulartics2 } from 'angulartics2';
import { AuthService } from 'src/app/services/auth.service';
import { ExistingAuthUser } from 'src/app/models/user';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  public user: ExistingAuthUser = {
    email: '',
    password: '',
    companyId: ''
  };
  public userCompanies: [];
  public authCode: string;
  public submitting: boolean;
  public isPasswordFieldShown: boolean = false;
  public is2FAShown: boolean = false;

  constructor(
    private _auth: AuthService,
    public router: Router,
    private angulartics2: Angulartics2,
    private ngZone: NgZone,
  ) { }

  ngOnInit(): void {
    //@ts-ignore
    google.accounts.id.initialize({
      client_id: "681163285738-e4l0lrv5vv7m616ucrfhnhso9r396lum.apps.googleusercontent.com",
      callback: (authUser) => {
        this.ngZone.run(() => {
          this._auth.loginWithGoogle(authUser.credential).subscribe(() => {
            this.angulartics2.eventTrack.next({
              action: 'Login: google login success'
            });
          });
        })
      }
    });
    //@ts-ignore
    google.accounts.id.renderButton(
      document.getElementById("google_login_button"),
      { theme: "outline", size: "large", width: "360px", text: "continue_with" }
    );
    //@ts-ignore
    google.accounts.id.prompt();
  }

  requestUserCompanies() {
    this._auth.fetchUserCompanies(this.user.email)
      .subscribe(companies => {
        this.angulartics2.eventTrack.next({
          action: 'Login: companies is received',
          properties: {
            count: companies.length
          }
        })

        this.userCompanies = companies;

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
