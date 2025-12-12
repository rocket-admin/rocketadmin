import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, EMPTY, Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { NotificationsService } from './notifications.service';
import {
  Secret,
  SecretListResponse,
  AuditLogResponse,
  CreateSecretPayload,
  UpdateSecretPayload,
  DeleteSecretResponse,
} from '../models/secret';

@Injectable({
  providedIn: 'root'
})
export class SecretsService {
  private secretsUpdated = new BehaviorSubject<string>('');
  public cast = this.secretsUpdated.asObservable();

  constructor(
    private _http: HttpClient,
    private _notifications: NotificationsService
  ) {}

  fetchSecrets(page: number = 1, limit: number = 20, search?: string): Observable<SecretListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this._http.get<SecretListResponse>('/secrets', { params })
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error?.message || 'Failed to fetch secrets');
          return EMPTY;
        })
      );
  }

  createSecret(payload: CreateSecretPayload): Observable<Secret> {
    return this._http.post<Secret>('/secrets', payload)
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar('Secret created successfully');
          this.secretsUpdated.next('created');
          return res;
        }),
        catchError((err) => {
          console.log(err);
          if (err.status === 409) {
            this._notifications.showErrorSnackbar('A secret with this slug already exists');
          } else {
            this._notifications.showErrorSnackbar(err.error?.message || 'Failed to create secret');
          }
          return EMPTY;
        })
      );
  }

  updateSecret(slug: string, payload: UpdateSecretPayload, masterPassword?: string): Observable<Secret> {
    let headers = new HttpHeaders();
    if (masterPassword) {
      headers = headers.set('masterPassword', masterPassword);
    }

    return this._http.put<Secret>(`/secrets/${slug}`, payload, { headers })
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar('Secret updated successfully');
          this.secretsUpdated.next('updated');
          return res;
        }),
        catchError((err) => {
          console.log(err);
          if (err.status === 403) {
            return throwError(() => err);
          }
          if (err.status === 410) {
            this._notifications.showErrorSnackbar('Cannot update an expired secret');
          } else {
            this._notifications.showErrorSnackbar(err.error?.message || 'Failed to update secret');
          }
          return EMPTY;
        })
      );
  }

  deleteSecret(slug: string): Observable<DeleteSecretResponse> {
    return this._http.delete<DeleteSecretResponse>(`/secrets/${slug}`)
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar('Secret deleted successfully');
          this.secretsUpdated.next('deleted');
          return res;
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error?.message || 'Failed to delete secret');
          return EMPTY;
        })
      );
  }

  getAuditLog(slug: string, page: number = 1, limit: number = 50): Observable<AuditLogResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this._http.get<AuditLogResponse>(`/secrets/${slug}/audit-log`, { params })
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error?.message || 'Failed to fetch audit log');
          return EMPTY;
        })
      );
  }
}
