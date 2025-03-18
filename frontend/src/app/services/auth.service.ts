import * as Sentry from "@sentry/angular-ivy";

import { AlertActionType, AlertType } from '../models/alert';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { ExistingAuthUser, NewAuthUser } from '../models/user';
import { catchError, map } from 'rxjs/operators';

import { ConfigurationService } from './configuration.service';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NotificationsService } from './notifications.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = new BehaviorSubject<any>('');
  public cast = this.auth.asObservable();

  constructor(
    private _http: HttpClient,
    private _notifications: NotificationsService,
    private _configuration: ConfigurationService
  ) { }

  signUpUser(userData: NewAuthUser) {
    const config = this._configuration.getConfig();
    return this._http.post<any>(config.saasURL + '/saas/user/register', userData)
      .pipe(
        map(res => {
          if ((environment as any).saas) {
            // @ts-ignore
            fbq('trackCustom', 'Signup');
          }
          this._notifications.showSuccessSnackbar(`Confirmation email has been sent to you.`);
          this.auth.next(res);
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: () => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      )
  }

  signUpWithGoogle(token: string) {
    const config = this._configuration.getConfig();

    return this._http.post<any>(config.saasURL + '/saas/user/google/register', {token})
    .pipe(
      map(res => {
        this.auth.next(res);
        return res
      }),
      catchError((err) => {
        console.log(err);
        Sentry.captureException(err);
        this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
          {
            type: AlertActionType.Button,
            caption: 'Dismiss',
            action: (id: number) => this._notifications.dismissAlert()
          }
        ]);
        return EMPTY;
      })
    );
  }

  signUpWithGithub() {
    const config = this._configuration.getConfig();

    location.assign(config.saasURL + '/saas/user/github/registration/request');
  }

  loginUser(userData: ExistingAuthUser) {
    if (userData.companyId === '') {
      delete userData.companyId;
    }
    return this._http.post<any>('/user/login', userData)
    .pipe(
      map(res => {
        this.auth.next(res);
        return res
      }),
      catchError((err) => {
        console.log(err);
        this._notifications.showAlert(AlertType.Error, {abstract: err.error.message || err.message, details: err.error.originalMessage}, [
          {
            type: AlertActionType.Button,
            caption: 'Dismiss',
            action: () => this._notifications.dismissAlert()
          }
        ]);
        return EMPTY;
      })
    );
  }

  loginWith2FA(code: string) {
    return this._http.post<any>('/user/otp/login', {otpToken: code})
    .pipe(
      map(res => {
        this.auth.next(res);
        return res
      }),
      catchError((err) => {
        console.log(err);
        this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
          {
            type: AlertActionType.Button,
            caption: 'Dismiss',
            action: () => this._notifications.dismissAlert()
          }
        ]);
        return EMPTY;
      })
    );
  }

  loginWithGoogle(token: string) {
    const config = this._configuration.getConfig();

    return this._http.post<any>(config.saasURL + '/saas/user/google/login', {token})
    .pipe(
      map(res => {
        this.auth.next(res);
        return res
      }),
      catchError((err) => {
        console.log(err);
        Sentry.captureException(err);
        this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
          {
            type: AlertActionType.Button,
            caption: 'Dismiss',
            action: (id: number) => this._notifications.dismissAlert()
          }
        ]);
        return EMPTY;
      })
    );
  }

  loginWithGithub() {
    const config = this._configuration.getConfig();

    location.assign(config.saasURL + '/saas/user/github/login/request');
  }

  requestEmailVerifications() {
    return this._http.get<any>('/user/email/verify/request')
    .pipe(
      map(res => {
        this._notifications.showSuccessSnackbar('Confirmation email has been sent.');
        return res
      }),
      catchError((err) => {
        console.log(err);
        this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
          {
            type: AlertActionType.Button,
            caption: 'Dismiss',
            action: () => this._notifications.dismissAlert()
          }
        ]);
        return EMPTY;
      })
    );
  }

  verifyEmail(token: string) {
    return this._http.get<any>(`/user/email/verify/${token}`)
    .pipe(
      map(res => {
        this._notifications.showSuccessSnackbar('Your email is verified.');
        this.auth.next(res);
        return res
      }),
      catchError((err) => {
        console.log(err);
        this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
          {
            type: AlertActionType.Button,
            caption: 'Dismiss',
            action: () => this._notifications.dismissAlert()
          }
        ]);
        return EMPTY;
      })
    );
  }

  fetchUserCompanies(email: string) {
    return this._http.get<any>(`/company/my/email/${email}`)
    .pipe(
      map(res => res),
      catchError((err) => {
        console.log(err);
        this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
          {
            type: AlertActionType.Button,
            caption: 'Dismiss',
            action: () => this._notifications.dismissAlert()
          }
        ]);
        return EMPTY;
      })
    );
  }

  checkInvitationAvailability(token: string) {
    return this._http.get<any>(`/company/invite/verify/${token}`)
    .pipe(
      map(res => {return res}),
      catchError((err) => {
        console.log(err);
        this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
          {
            type: AlertActionType.Button,
            caption: 'Dismiss',
            action: () => this._notifications.dismissAlert()
          }
        ]);
        return EMPTY;
      })
    );
  };

  acceptCompanyInvitation(token: string, password: string, userName: string) {
    return this._http.post<any>(`/company/invite/verify/${token}`, {
      password,
      userName
    })
      .pipe(
        map(res => {
          this.auth.next(res);
          return res;
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  logOutUser() {
    return this._http.post<any>('/user/logout', undefined)
      .pipe(
        map(() => {
          this._notifications.showSuccessSnackbar('User is logged out.');
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  }
}
