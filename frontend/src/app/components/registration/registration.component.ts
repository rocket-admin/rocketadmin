import { Component, NgZone, OnInit } from '@angular/core';

import { Angulartics2 } from 'angulartics2';
import { AuthService } from 'src/app/services/auth.service';
import { NewAuthUser } from 'src/app/models/user';
import { Router } from '@angular/router';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css']
})
export class RegistrationComponent implements OnInit {

  public user: NewAuthUser = {
    email: '',
    password: ''
  };
  public submitting: boolean;

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
          this._auth.signUpWithGoogle(authUser.credential).subscribe(() => {
            this.angulartics2.eventTrack.next({
              action: 'Reg: google register success'
            });
          });
        })
      }
    });
    //@ts-ignore
    google.accounts.id.renderButton(
      document.getElementById("google_registration_button"),
      { theme: "filled_blue", size: "large", width: "400px", text: "signup_with" }
    );
    //@ts-ignore
    google.accounts.id.prompt();
  }

  updatePasswordField(updatedValue: string) {
    this.user.password = updatedValue;
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
        action: 'Reg: sing up unsuccessful'
      });
      this.submitting = false;
    }, () => this.submitting = false)
  }

  registerWithGithub() {
    this._auth.signUpWithGithub();
    this.angulartics2.eventTrack.next({
      action: 'Reg: github register redirect'
    });
  }
}
