import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthUser } from 'src/app/models/user';
import { Angulartics2 } from 'angulartics2';
import { AuthService } from 'src/app/services/auth.service';
import { SocialAuthService, FacebookLoginProvider, GoogleLoginProvider } from 'angularx-social-login';

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
    private socialAuthService: SocialAuthService
  ) { }

  ngOnInit(): void {
    this.socialAuthService.authState.subscribe((authUser) => {
      console.log('loginpage authUser from fb listener')
      console.log(authUser)
      if (authUser.provider === "FACEBOOK") this._auth.loginWithFacebook(authUser.authToken).subscribe();
      if (authUser.provider === "GOOGLE") this._auth.loginWithGoogle(authUser.idToken).subscribe();
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

  loginWithGoogle() {
    this.socialAuthService.signIn(GoogleLoginProvider.PROVIDER_ID);
  }
}
