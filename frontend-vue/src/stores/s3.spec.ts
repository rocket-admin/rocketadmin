// Ports the behaviour covered by frontend/src/app/services/s3.service.spec.ts.
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { jsonResponse, mockFetch, textResponse } from '@/__tests__/mock-fetch';
import { AlertType } from '@/models/alert';
import { useNotificationsStore } from '@/stores/notifications';
import { useS3Store } from './s3';

vi.mock('@/environment', () => ({ environment: { apiRoot: '', saasURL: '' } }));
vi.mock('@/config', () => ({ getConfig: () => ({ baseURL: '/api', saasURL: '' }) }));

const connectionId = 'conn-123';
const tableName = 'users';
const fieldName = 'avatar';
const uploadUrl = 'https://bucket.s3.amazonaws.com/uploads/file.pdf?signature=abc';
const fileUrlResponse = { url: 'https://bucket.s3.amazonaws.com/file.pdf', key: 'uploads/file.pdf', expiresIn: 3600 };
const uploadUrlResponse = {
	uploadUrl,
	key: 'uploads/file.pdf',
	expiresIn: 3600,
	previewUrl: 'https://bucket.s3.amazonaws.com/uploads/file.pdf?preview',
};
const serverError = { message: 'Access denied' };

describe('s3 store', () => {
	let showAlert: MockInstance<ReturnType<typeof useNotificationsStore>['showAlert']>;

	beforeEach(() => {
		setActivePinia(createPinia());
		showAlert = vi.spyOn(useNotificationsStore(), 'showAlert');
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function expectAlert(abstract: string, details: string) {
		expect(showAlert).toHaveBeenCalledWith(AlertType.Error, { abstract, details }, [
			expect.objectContaining({ caption: 'Dismiss' }),
		]);
	}

	describe('getFileUrl', () => {
		it('sends the field and the JSON primary key', async () => {
			const fetch = mockFetch(jsonResponse(fileUrlResponse));
			const result = await useS3Store().getFileUrl(connectionId, tableName, fieldName, { user_id: 1, org_id: 'abc' });
			expect(result).toEqual(fileUrlResponse);
			const url = new URL(fetch.last().url, location.origin);
			expect(url.pathname).toBe(`/api/s3/file/${connectionId}`);
			expect(url.searchParams.get('tableName')).toBe(tableName);
			expect(url.searchParams.get('fieldName')).toBe(fieldName);
			expect(url.searchParams.get('rowPrimaryKey')).toBe(JSON.stringify({ user_id: 1, org_id: 'abc' }));
		});

		it('shows an alert and resolves null on failure', async () => {
			mockFetch(jsonResponse(serverError, 403));
			expect(await useS3Store().getFileUrl(connectionId, tableName, fieldName, { id: 1 })).toBeNull();
			expectAlert('Failed to get S3 file URL', 'Access denied');
			expect(showAlert).toHaveBeenCalledTimes(1);
		});
	});

	describe('getUploadUrl', () => {
		it('posts the file name and content type', async () => {
			const fetch = mockFetch(jsonResponse(uploadUrlResponse));
			const result = await useS3Store().getUploadUrl(connectionId, tableName, fieldName, 'photo.jpg', 'image/jpeg');
			expect(result).toEqual(uploadUrlResponse);
			expect(fetch.last().url).toBe(`/api/s3/upload-url/${connectionId}?tableName=users&fieldName=avatar`);
			expect(fetch.last().json).toEqual({ filename: 'photo.jpg', contentType: 'image/jpeg' });
		});

		it('shows an alert and resolves null on failure', async () => {
			mockFetch(jsonResponse(serverError, 500));
			expect(
				await useS3Store().getUploadUrl(connectionId, tableName, fieldName, 'a.pdf', 'application/pdf'),
			).toBeNull();
			expectAlert('Failed to get upload URL', 'Access denied');
		});
	});

	describe('uploadToS3', () => {
		it('puts the file to the presigned URL with its content type and no credentials', async () => {
			const fetch = mockFetch(textResponse(''));
			const file = new File(['img'], 'photo.png', { type: 'image/png' });
			expect(await useS3Store().uploadToS3(uploadUrl, file)).toBe(true);

			const [, init] = fetch.fn.mock.calls[0] ?? [];
			expect(fetch.last().url).toBe(uploadUrl);
			expect(fetch.last().method).toBe('PUT');
			expect(fetch.last().body).toBe(file);
			expect(fetch.last().headers.get('Content-Type')).toBe('image/png');
			expect(init?.credentials).toBe('same-origin');
		});

		it('shows an alert and resolves false on failure', async () => {
			mockFetch(textResponse('<Error/>', 403));
			expect(await useS3Store().uploadToS3(uploadUrl, new File(['x'], 'a.txt'))).toBe(false);
			expect(showAlert).toHaveBeenCalledWith(
				AlertType.Error,
				expect.objectContaining({ abstract: 'File upload failed' }),
				expect.any(Array),
			);
		});
	});

	describe('uploadFile', () => {
		it('gets an upload URL, uploads and resolves the key and preview URL', async () => {
			const fetch = mockFetch(jsonResponse(uploadUrlResponse), textResponse(''));
			const file = new File(['pdf'], 'file.pdf', { type: 'application/pdf' });
			const result = await useS3Store().uploadFile(connectionId, tableName, fieldName, file);

			expect(result).toEqual({ key: uploadUrlResponse.key, previewUrl: uploadUrlResponse.previewUrl });
			expect(fetch.requests.map((request) => request.method)).toEqual(['POST', 'PUT']);
			expect(fetch.requests[0]?.json).toEqual({ filename: 'file.pdf', contentType: 'application/pdf' });
			expect(fetch.requests[1]?.url).toBe(uploadUrl);
		});

		it('resolves null without uploading when the upload URL fails', async () => {
			const fetch = mockFetch(jsonResponse(serverError, 500));
			expect(await useS3Store().uploadFile(connectionId, tableName, fieldName, new File(['x'], 'a.pdf'))).toBeNull();
			expect(fetch.requests).toHaveLength(1);
			expectAlert('File upload failed', 'Access denied');
		});

		it('resolves null when the S3 upload fails', async () => {
			mockFetch(jsonResponse(uploadUrlResponse), textResponse('', 403));
			expect(await useS3Store().uploadFile(connectionId, tableName, fieldName, new File(['x'], 'a.pdf'))).toBeNull();
			expect(showAlert).toHaveBeenCalledWith(
				AlertType.Error,
				expect.objectContaining({ abstract: 'File upload failed' }),
				expect.any(Array),
			);
		});
	});
});
