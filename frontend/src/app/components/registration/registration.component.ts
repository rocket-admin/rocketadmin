import { Component, NgZone, OnInit } from '@angular/core';

import { Angulartics2 } from 'angulartics2';
import { AuthService } from 'src/app/services/auth.service';
import { AuthUser } from 'src/app/models/user';
import { Router } from '@angular/router';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css']
})
export class RegistrationComponent implements OnInit {

  public user: AuthUser = {
    email: '',
    password: ''
  };
  public submitting: boolean;
  public passwordHidden: boolean;

  constructor(
    private ngZone: NgZone,
    private angulartics2: Angulartics2,
    public router: Router,
    private _auth: AuthService
  ) {
   }

  ngOnInit(): void {
    this.angulartics2.eventTrack.next({
      action: 'Reg: Registration page (component) is loaded'
    });

    //@ts-ignore
    gtag('event', 'conversion', {'send_to': 'AW-419937947/auKoCOvwgoYDEJv9nsgB'});

    //@ts-ignore
    google.accounts.id.initialize({
      client_id: "681163285738-e4l0lrv5vv7m616ucrfhnhso9r396lum.apps.googleusercontent.com",
      callback: (authUser) => {
        this.ngZone.run(() => {
          this._auth.loginWithGoogle(authUser.credential).subscribe(() => {
            this.angulartics2.eventTrack.next({
              action: 'Reg: google login success'
            });
          });
        })
      }
    });
    //@ts-ignore
    google.accounts.id.renderButton(
      document.getElementById("google_registration_button"),
      { theme: "filled_blue", size: "large", width: "400px" }
    );
    //@ts-ignore
    google.accounts.id.prompt();

    //@ts-ignore
    window.loginWithFacebook = () => {
      //@ts-ignore
      FB.getLoginStatus((response) => {
        this.ngZone.run(() => {
          this._auth.loginWithFacebook(response.authResponse.accessToken).subscribe(() => {
            this.angulartics2.eventTrack.next({
              action: 'Reg: fb login success'
            });
          });
        })
      });
    }
  }

  registerUser() {
    this.submitting = true;

    this._auth.signUpUser(this.user)
    .subscribe(() => {
      this.angulartics2.eventTrack.next({
        action: 'Reg: sing up success'
      });
    }, (error) => {
      this.angulartics2.eventTrack.next({
        action: 'Reg: sing up unsuccess'
      });
      this.submitting = false;
    }, () => this.submitting = false)
  }
}
