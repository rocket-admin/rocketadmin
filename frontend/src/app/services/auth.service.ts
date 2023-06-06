import { AlertActionType, AlertType } from '../models/alert';
import { BehaviorSubject, EMPTY, Subject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { AuthUser } from '../models/user';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NotificationsService } from './notifications.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = new BehaviorSubject<any>('');
  public cast = this.auth.asObservable();

  constructor(
    private _http: HttpClient,
    private _notifications: NotificationsService
  ) { }

  signUpUser(userData: AuthUser) {
    return this._http.post<any>('/user/register', userData)
      .pipe(
        map(res => {
          // @ts-ignore
          fbq('trackCustom', 'Signup');
          this._notifications.showSuccessSnackbar(`Confirmation email has been sent to you.`);
          this.auth.next(res);
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, err.error.message, [
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

  loginUser(userData: AuthUser) {
    return this._http.post<any>('/user/login', userData)
    .pipe(
      map(res => {
        this.auth.next(res);
        return res
      }),
      catchError((err) => {
        console.log(err);
        this._notifications.showAlert(AlertType.Error, err.error.message, [
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

  loginWithGoogle(token: string) {
    return this._http.post<any>('/user/google/login', {token})
    .pipe(
      map(res => {
        this.auth.next(res);
        return res
      }),
      catchError((err) => {
        console.log(err);
        this._notifications.showAlert(AlertType.Error, err.error.message, [
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

  requestEmailVerifications() {
    return this._http.get<any>('/user/email/verify/request')
    .pipe(
      map(res => {
        this._notifications.showSuccessSnackbar('Confirmation email has been sent.');
        return res
      }),
      catchError((err) => {
        console.log(err);
        this._notifications.showAlert(AlertType.Error, err.error.message, [
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
        this._notifications.showAlert(AlertType.Error, err.error.message, [
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
