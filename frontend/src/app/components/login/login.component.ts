import { Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthUser } from 'src/app/models/user';
import { Angulartics2 } from 'angulartics2';
import { AuthService } from 'src/app/services/auth.service';
import { SocialAuthService, FacebookLoginProvider, GoogleLoginProvider } from '@abacritt/angularx-social-login';

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
  public submitting: boolean;

  constructor(
    private _auth: AuthService,
    public router: Router,
    private angulartics2: Angulartics2,
    private socialAuthService: SocialAuthService,
    private ngZone: NgZone,
  ) { }

  ngOnInit(): void {
    //@ts-ignore
    google.accounts.id.initialize({
      client_id: "681163285738-e4l0lrv5vv7m616ucrfhnhso9r396lum.apps.googleusercontent.com",
      callback: (authUser) => {
        this.ngZone.run(() => {
          this._auth.loginWithGoogle(authUser.credential).subscribe();
        })
      }
    });
    //@ts-ignore
    google.accounts.id.renderButton(
      document.getElementById("google_login_button"),
      { theme: "filled_blue", size: "large", width: "224px" }
    );
    //@ts-ignore
    google.accounts.id.prompt();

    this.socialAuthService.authState.subscribe((authUser) => {
      console.log('loginpage authUser from fb listener')
      console.log(authUser)
      if (authUser.provider === "FACEBOOK") this._auth.loginWithFacebook(authUser.authToken).subscribe();
    });
  }

  loginUser() {
    this.submitting = true;
    this._auth.loginUser(this.user)
      .subscribe(() => {
        this.submitting = false;
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

  loginWithFacebook() {
    this.socialAuthService.signIn(FacebookLoginProvider.PROVIDER_ID);
  }
}
