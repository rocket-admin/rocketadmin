import { AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, Component, NgZone, OnInit } from '@angular/core';
import { AlertActionType, AlertType } from 'src/app/models/alert';

import { AlertComponent } from '../ui-components/alert/alert.component';
import { Angulartics2 } from 'angulartics2';
import { AuthService } from 'src/app/services/auth.service';
import { CommonModule } from '@angular/common';
import { EmailValidationDirective } from 'src/app/directives/emailValidator.directive';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { NewAuthUser } from 'src/app/models/user';
import { NotificationsService } from 'src/app/services/notifications.service';
import { Router } from '@angular/router';
import { UserPasswordComponent } from '../ui-components/user-password/user-password.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    EmailValidationDirective,
    AlertComponent,
    UserPasswordComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RegistrationComponent implements OnInit, AfterViewInit {

  public isSaas = (environment as any).saas;
  public user: NewAuthUser = {
    email: '',
    password: ''
  };
  public submitting: boolean;
  public errors = {
    'User_with_this_email_is_already_registered.': 'User with this email is already registered',
    'GitHub_registration_failed._Please_contact_our_support_team.': 'GitHub registration failed. Please contact our support team.',
  }

  constructor(
    private ngZone: NgZone,
    private angulartics2: Angulartics2,
    public router: Router,
    private _auth: AuthService,
    private _notifications: NotificationsService,
  ) {
   }

  ngOnInit(): void {
    this.angulartics2.eventTrack.next({
      action: 'Reg: Registration page (component) is loaded'
    });

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
      { theme: "filled_blue", size: "large", width: 400, text: "signup_with" }
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
