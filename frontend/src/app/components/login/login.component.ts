import { Component, NgZone, OnInit } from '@angular/core';

import { Angulartics2 } from 'angulartics2';
import { AuthService } from 'src/app/services/auth.service';
import { AuthUser } from 'src/app/models/user';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  public user: AuthUser = {
    email: '',
    password: ''
  };
  public authCode: string;
  public submitting: boolean;
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
      { theme: "filled_blue", size: "large", width: "400px" }
    );
    //@ts-ignore
    google.accounts.id.prompt();
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
          action: 'Login: login unsuccess'
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
          action: 'Login: login with 2fa unsuccess'
        });
        this.submitting = false;
      }, () => this.submitting = false)
  }
}
