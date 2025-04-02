import { AlertActionType, AlertType } from '../models/alert';
import { catchError, map } from 'rxjs/operators';

import { CompanyMemberRole } from '../models/company';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NotificationsService } from './notifications.service';
import { ConfigurationService } from './configuration.service';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  private company = new BehaviorSubject<string>('');
  public cast = this.company.asObservable();

  private companyLogo: string;

  constructor(
    private _http: HttpClient,
    private _notifications: NotificationsService,
    private _configuration: ConfigurationService
  ) { }

  get logo() {
    return this.companyLogo;
  }

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

  updateCompanyName(companyId: string, name: string) {
    return this._http.put<any>(`/company/name/${companyId}`, {name})
      .pipe(
        map(res => this._notifications.showSuccessSnackbar('Company name has been updated.')),
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
          this._notifications.showSuccessSnackbar(`Invitation link has been sent to ${email}.`);
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
          this._notifications.showSuccessSnackbar(`Invitation has been revoked for ${email}.`);
          this.company.next('revoked');
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message || err.message);
          return EMPTY;
        })
      );
  }

  removeCompanyMemder(companyId: string, userId:string, email: string, userName: string) {
    return this._http.delete<any>(`/company/${companyId}/user/${userId}`)
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar(`${userName || email} has been removed from company.`);
          this.company.next('deleted');
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

  updateCompanyMemberRole(companyId: string, userId: string, role: CompanyMemberRole) {
    return this._http.put<any>(`/company/users/roles/${companyId}`, { users: [{userId, role}] })
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar(`Company member role has been updated.`);
          this.company.next('role');
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

  suspendCompanyMember(companyId: string, usersEmails: string[]) {
    return this._http.put<any>(`/company/users/suspend/${companyId}`, { usersEmails })
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar(`Company member has been suspended.`);
          this.company.next('suspended');
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

  restoreCompanyMember(companyId: string, usersEmails: string[]) {
    return this._http.put<any>(`/company/users/unsuspend/${companyId}`, { usersEmails })
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar(`Company member has been restored.`);
          this.company.next('unsuspended');
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

  updateShowTestConnections(displayMode: 'on' | 'off') {
    return this._http.put<any>(`/company/connections/display`, undefined, { params: { displayMode }})
      .pipe(
        map(res => {
          if (displayMode === 'on') {
            this._notifications.showSuccessSnackbar('Test connections now are displayed to your company members.');
          } else {
            this._notifications.showSuccessSnackbar('Test connections now are hidden from your company members.');
          }
          this.company.next('');
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

  getCustomDomain(companyId: string) {
    const config = this._configuration.getConfig();

    return this._http.get<any>(config.saasURL + `/saas/custom-domain/${companyId}`)
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message || err.message);
          return EMPTY;
        })
      );
  }

  createCustomDomain(companyId: string, hostname: string) {
    const config = this._configuration.getConfig();

    return this._http.post<any>(config.saasURL + `/saas/custom-domain/register/${companyId}`, { hostname })
      .pipe(
        map(res => {
          // this._notifications.showAlert('Custom domain has been added.');
          this._notifications.showAlert(AlertType.Success,
            {
              abstract: `Now your admin panel is live on your own domain: ${hostname}`,
              details: 'Check it out! If you have any issues or need help setting up your domain or CNAME record, please reach out to our support team.'
            },
            [
              {
                type: AlertActionType.Anchor,
                caption: 'Open',
                to: `https://${hostname}`
              },
              {
                type: AlertActionType.Button,
                caption: 'Dismiss',
                action: (id: number) => this._notifications.dismissAlert()
              }
            ]
          );
          this.company.next('domain');
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message || err.message);
          return EMPTY;
        })
      );
  }

  updateCustomDomain(companyId: string, hostname: string) {
    const config = this._configuration.getConfig();

    return this._http.put<any>(config.saasURL + `/saas/custom-domain/update/${companyId}`, { hostname })
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar('Custom domain has been updated.');
          this.company.next('domain');
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message || err.message);
          return EMPTY;
        })
      );
  }

  deleteCustomDomain(companyId: string) {
    const config = this._configuration.getConfig();

    return this._http.delete<any>(config.saasURL + `/saas/custom-domain/delete/${companyId}`)
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar('Custom domain has been removed.');
          this.company.next('domain');
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message || err.message);
          return EMPTY;
        })
      );
  }

  uploadLogo(companyId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this._http.post<any>(`/company/logo/${companyId}`, formData)
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar('Logo has been updated.');
          this.company.next('logo');
          // this.getCompanyLogo(companyId);
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message || err.message);
          return EMPTY;
        })
      );
  }

  getCompanyLogo(companyId: string) {
    return this._http.get<any>(`/company/logo/${companyId}`)
      .pipe(
        map(res => {
          this.companyLogo = `data:${res.logo.mimeType};base64,${res.logo.image}`;
          return `data:${res.logo.mimeType};base64,${res.logo.image}`;
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message || err.message);
          return EMPTY;
        })
      );
  }

}
