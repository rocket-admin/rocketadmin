import { AlertActionType, AlertType } from '../models/alert';
import { catchError, map } from 'rxjs/operators';

import { CompanyMemberRole } from '../models/company';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NotificationsService } from './notifications.service';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  private company = new BehaviorSubject<string>('');
  public cast = this.company.asObservable();

  constructor(
    private _http: HttpClient,
    private _notifications: NotificationsService
  ) { }

  fetchCompany() {
    return this._http.get<any>(`/company/my/full`)
      .pipe(
        map(res => res),
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
  };

  fetchCompanyMembers(companyId: string) {
    return this._http.get<any>(`/company/users/${companyId}`)
      .pipe(
        map(res => res),
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
  };

  fetchCompanyName(companyId: string) {
    return this._http.get<any>(`/company/name/${companyId}`)
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message || err.message);
          return EMPTY;
        })
      );
  }

  inviteCompanyMember(companyId: string, groupId: string, email: string, role: CompanyMemberRole) {
    return this._http.put<any>(`/company/user/${companyId}`, {
      groupId,
      email,
      role
    })
      .pipe(
        map(() => {
          this.company.next('invited');
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message || err.message);
          return EMPTY;
        })
      );
  }

  revokeInvitation(companyId: string, email: string) {
    return this._http.put<any>(`/company/invitation/revoke/${companyId}`, { email })
      .pipe(
        map(() => {
          this.company.next('revoked');
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message || err.message);
          return EMPTY;
        })
      );
  }

  removeCompanyMemder(companyId: string, email: string, userName: string) {
    return this._http.put<any>(`/company/user/remove/${companyId}`, {
      email
    })
      .pipe(
        map(res => {
          this._notifications.showAlert(AlertType.Success, `${userName || email} has been removed from company.`, [
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
}
