import { AlertActionType, AlertType } from '../models/alert';
import { BehaviorSubject, EMPTY, throwError } from 'rxjs';
import { SubscriptionPlans, User } from '../models/user';
import { catchError, map } from 'rxjs/operators';

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NotificationsService } from './notifications.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  public initialUserState:User = {
    id: '',
    isActive: false,
    email: '',
    createdAt: '',
    portal_link: '',
    subscriptionLevel: SubscriptionPlans.free,
    is_2fa_enabled: false,
  }

  private user = new BehaviorSubject<any>(this.initialUserState);
  public cast = this.user.asObservable();

  constructor(
    private _http: HttpClient,
    private _notifications: NotificationsService,
    public router: Router
  ) { }

  get user$(){
    return this.user.asObservable();
  }

  fetchUser() {
    return this._http.get<any>('/user')
      .pipe(
        map(res => {
          console.log(res);
          this.user.next(res);
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message || err.message);
          return EMPTY;
        })
      );
  }

  sendUserAction(message: string) {
    return this._http.post<any>('/action', {message: message})
    .pipe(
      map(res => res),
      catchError((err) => {
        console.log(err);
        return EMPTY;
      })
    );
  }

  requestEmailChange() {
    return this._http.get<any>(`/user/email/change/request`)
    .pipe(
      map(res => {
        this._notifications.showAlert(AlertType.Info, 'Link has been sent to your email. Please check it.', [
          {
            type: AlertActionType.Button,
            caption: 'Dismiss',
            action: (id: number) => this._notifications.dismissAlert()
          }
        ]);
        return res
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

  changeEmail(token: string, newEmail: string) {
    return this._http.post<any>(`/user/email/change/verify/${token}`, {email: newEmail})
    .pipe(
      map(res => {
        this._notifications.showSuccessSnackbar('You email has been changed successfully.');
        return res
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

  requestPasswordReset(email: string) {
    return this._http.post<any>(`/user/password/reset/request`, { email })
    .pipe(
      map(res => {
        this._notifications.showAlert(AlertType.Success, 'Check your email.', [
          {
            type: AlertActionType.Button,
            caption: 'Dismiss',
            action: (id: number) => this._notifications.dismissAlert()
          }
        ]);
        return res
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

  resetPassword(token: string, newPassword: string) {
    return this._http.post<any>(`/user/password/reset/verify/${token}`, {password: newPassword})
    .pipe(
      map(res => {
        this._notifications.showSuccessSnackbar('Your password has been reset successfully.');
        return res
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

  changePassword(oldPassword: string, newPassword: string, email: string) {
    return this._http.post<any>(`/user/password/change/`, {email, oldPassword, newPassword})
    .pipe(
      map(res => {
        this._notifications.showSuccessSnackbar('Your password has been changed successfully.');
        return res
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

  changeUserName(userName: string) {
    return this._http.put<any>(`/user/name`, {name: userName})
      .pipe(
        map((res) => {
          this._notifications.showSuccessSnackbar('Your name has been changed successfully.');
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  }

  switchOn2FA() {
    return this._http.post<any>('/user/otp/generate', {})
      .pipe(
        map((res) => {
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  }

  confirm2FA(code: string) {
    return this._http.post<any>('/user/otp/verify', {otpToken: code})
      .pipe(
        map((res) => {
          this._notifications.showSuccessSnackbar('2FA is turned on successfully.');
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return throwError(() => new Error(err.error.message));
        })
      );
  }

  switchOff2FA(code: string) {
    return this._http.post<any>('/user/otp/disable', {otpToken: code})
      .pipe(
        map((res) => {
          this._notifications.showSuccessSnackbar('2FA is turned off successfully.');
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  }


  deleteAccount(metadata) {
    return this._http.put<any>(`/user/delete`, metadata)
    .pipe(
      map(() => {
        this.user.next('delete');
        this.router.navigate(['/deleted']);
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
}
