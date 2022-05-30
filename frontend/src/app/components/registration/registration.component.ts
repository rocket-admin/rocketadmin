import { Component, NgZone, OnInit } from '@angular/core';
import { FacebookLoginProvider, GoogleLoginProvider, SocialAuthService } from '@abacritt/angularx-social-login';

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
    private _auth: AuthService,
    private socialAuthService: SocialAuthService
  ) { }

  ngOnInit(): void {
    this.angulartics2.eventTrack.next({
      action: 'Reg: Registration page (component) is loaded'
    });

    //@ts-ignore
    gtag('event', 'conversion', {'send_to': 'AW-419937947/auKoCOvwgoYDEJv9nsgB'});

    //@ts-ignore
    window.loginWithGoogle = (authUser) => {
      console.log('google callback');
      console.log(authUser);
      this.ngZone.run(() => {
        this._auth.loginWithGoogle(authUser.credential).subscribe();
      });

    }

    this.socialAuthService.authState.subscribe((authUser) => {
      console.log('regpage authUser from fb listener')
      console.log(authUser)
      if (authUser.provider === "FACEBOOK") this._auth.loginWithFacebook(authUser.authToken).subscribe();
      // if (authUser.provider === "GOOGLE") this._auth.loginWithGoogle(authUser.idToken).subscribe();
    });
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

  loginWithFacebook() {
    this.socialAuthService.signIn(FacebookLoginProvider.PROVIDER_ID);
  }

  // loginWithGoogle() {
  //   this.socialAuthService.signIn(GoogleLoginProvider.PROVIDER_ID);
  // }
}
