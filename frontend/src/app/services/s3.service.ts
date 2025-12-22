import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, EMPTY } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { AlertActionType, AlertType } from '../models/alert';

interface S3FileUrlResponse {
  url: string;
  key: string;
  expiresIn: number;
}

interface S3UploadUrlResponse {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

@Injectable({
  providedIn: 'root'
})
export class S3Service {
  constructor(
    private http: HttpClient,
    private notifications: NotificationsService
  ) {}

  getFileUrl(
    connectionId: string,
    tableName: string,
    fieldName: string,
    fileKey: string
  ): Observable<S3FileUrlResponse> {
    return this.http.get<S3FileUrlResponse>(`/s3/file/${connectionId}`, {
      params: { tableName, fieldName, fileKey }
    }).pipe(
      catchError(err => {
        this.notifications.showAlert(
          AlertType.Error,
          { abstract: 'Failed to get S3 file URL', details: err.error?.message },
          [{ type: AlertActionType.Button, caption: 'Dismiss', action: () => this.notifications.dismissAlert() }]
        );
        return EMPTY;
      })
    );
  }

  getUploadUrl(
    connectionId: string,
    tableName: string,
    fieldName: string,
    filename: string,
    contentType: string
  ): Observable<S3UploadUrlResponse> {
    return this.http.post<S3UploadUrlResponse>(
      `/s3/upload-url/${connectionId}`,
      { filename, contentType },
      { params: { tableName, fieldName } }
    ).pipe(
      catchError(err => {
        this.notifications.showAlert(
          AlertType.Error,
          { abstract: 'Failed to get upload URL', details: err.error?.message },
          [{ type: AlertActionType.Button, caption: 'Dismiss', action: () => this.notifications.dismissAlert() }]
        );
        return EMPTY;
      })
    );
  }

  uploadToS3(uploadUrl: string, file: File): Observable<void> {
    return this.http.put<void>(uploadUrl, file, {
      headers: { 'Content-Type': file.type }
    }).pipe(
      catchError(err => {
        this.notifications.showAlert(
          AlertType.Error,
          { abstract: 'File upload failed', details: err.message },
          [{ type: AlertActionType.Button, caption: 'Dismiss', action: () => this.notifications.dismissAlert() }]
        );
        return EMPTY;
      })
    );
  }
}
