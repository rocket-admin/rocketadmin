// Port of S3Service: presigned URLs for S3-backed file fields and the upload itself. Every method
// resolves a fallback (null / false) on failure after showing an error alert, as in Angular.
//
// The upload PUT goes straight to the presigned S3 URL; the client sends no credentials or API
// headers to non-API origins, so the signature stays valid.
import { defineStore } from 'pinia';
import { api, isApiError } from '@/api/client';
import { AlertActionType, AlertType } from '@/models/alert';
import { useNotificationsStore } from '@/stores/notifications';

export interface BucketFileUrlResponse {
	url: string;
	key: string;
	expiresIn: number;
}

export interface BucketUploadUrlResponse {
	uploadUrl: string;
	key: string;
	expiresIn: number;
	previewUrl: string;
}

export const useS3Store = defineStore('s3', () => {
	const notifications = useNotificationsStore();

	async function getFileUrl(
		connectionId: string,
		tableName: string,
		fieldName: string,
		rowPrimaryKey: Record<string, unknown>,
	): Promise<BucketFileUrlResponse | null> {
		try {
			return await api.get<BucketFileUrlResponse>(`/s3/file/${connectionId}`, {
				params: { tableName, fieldName, rowPrimaryKey: JSON.stringify(rowPrimaryKey) },
				notify: false,
			});
		} catch (error) {
			showError('Failed to get S3 file URL', serverMessage(error));
			return null;
		}
	}

	async function getUploadUrl(
		connectionId: string,
		tableName: string,
		fieldName: string,
		filename: string,
		contentType: string,
	): Promise<BucketUploadUrlResponse | null> {
		try {
			return await requestUploadUrl(connectionId, tableName, fieldName, filename, contentType);
		} catch (error) {
			showError('Failed to get upload URL', serverMessage(error));
			return null;
		}
	}

	async function uploadToS3(uploadUrl: string, file: File): Promise<boolean> {
		try {
			await putToS3(uploadUrl, file);
			return true;
		} catch (error) {
			showError('File upload failed', errorMessage(error));
			return false;
		}
	}

	/** Gets a presigned URL and uploads the file to it; resolves the S3 key and preview URL. */
	async function uploadFile(
		connectionId: string,
		tableName: string,
		fieldName: string,
		file: File,
	): Promise<{ key: string; previewUrl: string } | null> {
		try {
			const response = await requestUploadUrl(connectionId, tableName, fieldName, file.name, file.type);
			await putToS3(response.uploadUrl, file);
			return { key: response.key, previewUrl: response.previewUrl };
		} catch (error) {
			showError('File upload failed', serverMessage(error) || errorMessage(error));
			return null;
		}
	}

	return { getFileUrl, getUploadUrl, uploadToS3, uploadFile };

	function showError(abstract: string, details?: string): void {
		notifications.showAlert(AlertType.Error, { abstract, details: details ?? '' }, [
			{ type: AlertActionType.Button, caption: 'Dismiss', action: () => notifications.dismissAlert() },
		]);
	}
});

function requestUploadUrl(
	connectionId: string,
	tableName: string,
	fieldName: string,
	filename: string,
	contentType: string,
): Promise<BucketUploadUrlResponse> {
	return api.post<BucketUploadUrlResponse>(
		`/s3/upload-url/${connectionId}`,
		{ filename, contentType },
		{ params: { tableName, fieldName }, notify: false },
	);
}

function putToS3(uploadUrl: string, file: File): Promise<unknown> {
	return api.put(uploadUrl, file, { headers: { 'Content-Type': file.type }, notify: false, responseType: 'text' });
}

/** `err.error?.message` in Angular: the backend's message, if it sent one. */
function serverMessage(error: unknown): string | undefined {
	return isApiError(error) && typeof error.body.message === 'string' ? error.body.message : undefined;
}

function errorMessage(error: unknown): string | undefined {
	return error instanceof Error ? error.message : undefined;
}
