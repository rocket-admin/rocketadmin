import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AlertActionType, AlertType } from '../models/alert';
import { NotificationsService } from './notifications.service';

interface S3FileUrlResponse {
	url: string;
	key: string;
	expiresIn: number;
}

interface S3UploadUrlResponse {
	uploadUrl: string;
	key: string;
	expiresIn: number;
	previewUrl: string;
}

@Injectable({
	providedIn: 'root',
})
export class S3Service {
	private readonly http = inject(HttpClient);
	private readonly notifications = inject(NotificationsService);

	async getFileUrl(
		connectionId: string,
		tableName: string,
		fieldName: string,
		rowPrimaryKey: Record<string, unknown>,
	): Promise<S3FileUrlResponse | null> {
		try {
			return await firstValueFrom(
				this.http.get<S3FileUrlResponse>(`/s3/file/${connectionId}`, {
					params: {
						tableName,
						fieldName,
						rowPrimaryKey: JSON.stringify(rowPrimaryKey),
					},
				}),
			);
		} catch (err: any) {
			this._showError('Failed to get S3 file URL', err.error?.message);
			return null;
		}
	}

	async getUploadUrl(
		connectionId: string,
		tableName: string,
		fieldName: string,
		filename: string,
		contentType: string,
	): Promise<S3UploadUrlResponse | null> {
		try {
			return await firstValueFrom(
				this.http.post<S3UploadUrlResponse>(
					`/s3/upload-url/${connectionId}`,
					{ filename, contentType },
					{ params: { tableName, fieldName } },
				),
			);
		} catch (err: any) {
			this._showError('Failed to get upload URL', err.error?.message);
			return null;
		}
	}

	async uploadToS3(uploadUrl: string, file: File): Promise<boolean> {
		try {
			await firstValueFrom(
				this.http.put<void>(uploadUrl, file, {
					headers: { 'Content-Type': file.type },
				}),
			);
			return true;
		} catch (err: any) {
			this._showError('File upload failed', err.message);
			return false;
		}
	}

	/**
	 * Combined upload flow: gets presigned URL and uploads file in one operation.
	 * Returns the S3 key and preview URL on success.
	 */
	async uploadFile(
		connectionId: string,
		tableName: string,
		fieldName: string,
		file: File,
	): Promise<{ key: string; previewUrl: string } | null> {
		try {
			const response = await firstValueFrom(
				this.http.post<S3UploadUrlResponse>(
					`/s3/upload-url/${connectionId}`,
					{ filename: file.name, contentType: file.type },
					{ params: { tableName, fieldName } },
				),
			);

			await firstValueFrom(
				this.http.put<void>(response.uploadUrl, file, {
					headers: { 'Content-Type': file.type },
				}),
			);

			return { key: response.key, previewUrl: response.previewUrl };
		} catch (err: any) {
			this._showError('File upload failed', err.error?.message || err.message);
			return null;
		}
	}

	private _showError(abstract: string, details?: string): void {
		this.notifications.showAlert(AlertType.Error, { abstract, details }, [
			{
				type: AlertActionType.Button,
				caption: 'Dismiss',
				action: () => this.notifications.dismissAlert(),
			},
		]);
	}
}
