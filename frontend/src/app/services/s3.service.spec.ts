import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationsService } from './notifications.service';
import { S3Service } from './s3.service';

describe('S3Service', () => {
	let service: S3Service;
	let httpMock: HttpTestingController;
	let fakeNotifications: { showAlert: ReturnType<typeof vi.fn>; dismissAlert: ReturnType<typeof vi.fn> };

	const mockFileUrlResponse = {
		url: 'https://s3.amazonaws.com/bucket/file.pdf?signature=abc123',
		key: 'prefix/file.pdf',
		expiresIn: 3600,
	};

	const mockUploadUrlResponse = {
		uploadUrl: 'https://s3.amazonaws.com/bucket/prefix/newfile.pdf?signature=xyz789',
		key: 'prefix/newfile.pdf',
		expiresIn: 3600,
		previewUrl: 'https://s3.amazonaws.com/bucket/prefix/newfile.pdf?preview=true',
	};

	const fakeError = {
		message: 'Something went wrong',
		statusCode: 400,
	};

	beforeEach(() => {
		fakeNotifications = {
			showAlert: vi.fn(),
			dismissAlert: vi.fn(),
		};

		TestBed.configureTestingModule({
			imports: [MatSnackBarModule],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				S3Service,
				{ provide: NotificationsService, useValue: fakeNotifications },
			],
		});

		service = TestBed.inject(S3Service);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	describe('getFileUrl', () => {
		const connectionId = 'conn-123';
		const tableName = 'users';
		const fieldName = 'avatar';
		const rowPrimaryKey = { id: 1 };

		it('should fetch file URL successfully', async () => {
			const resultPromise = service.getFileUrl(connectionId, tableName, fieldName, rowPrimaryKey);

			const req = httpMock.expectOne(
				(request) =>
					request.url === `/s3/file/${connectionId}` &&
					request.params.get('tableName') === tableName &&
					request.params.get('fieldName') === fieldName &&
					request.params.get('rowPrimaryKey') === JSON.stringify(rowPrimaryKey),
			);
			expect(req.request.method).toBe('GET');
			req.flush(mockFileUrlResponse);

			const result = await resultPromise;
			expect(result).toEqual(mockFileUrlResponse);
		});

		it('should handle complex primary key', async () => {
			const complexPrimaryKey = { user_id: 1, org_id: 'abc' };

			const resultPromise = service.getFileUrl(connectionId, tableName, fieldName, complexPrimaryKey);

			const req = httpMock.expectOne(
				(request) =>
					request.url === `/s3/file/${connectionId}` &&
					request.params.get('rowPrimaryKey') === JSON.stringify(complexPrimaryKey),
			);
			req.flush(mockFileUrlResponse);

			const result = await resultPromise;
			expect(result).toEqual(mockFileUrlResponse);
		});

		it('should show error alert on failure', async () => {
			const resultPromise = service.getFileUrl(connectionId, tableName, fieldName, rowPrimaryKey);

			const req = httpMock.expectOne((request) => request.url === `/s3/file/${connectionId}`);
			req.flush(fakeError, { status: 400, statusText: 'Bad Request' });

			const result = await resultPromise;
			expect(result).toBeNull();
			expect(fakeNotifications.showAlert).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					abstract: 'Failed to get S3 file URL',
					details: fakeError.message,
				}),
				expect.any(Array),
			);
		});

		it('should return null on error', async () => {
			const resultPromise = service.getFileUrl(connectionId, tableName, fieldName, rowPrimaryKey);

			const req = httpMock.expectOne((request) => request.url === `/s3/file/${connectionId}`);
			req.flush(fakeError, { status: 400, statusText: 'Bad Request' });

			const result = await resultPromise;
			expect(result).toBeNull();
		});
	});

	describe('getUploadUrl', () => {
		const connectionId = 'conn-123';
		const tableName = 'users';
		const fieldName = 'avatar';
		const filename = 'document.pdf';
		const contentType = 'application/pdf';

		it('should fetch upload URL successfully', async () => {
			const resultPromise = service.getUploadUrl(connectionId, tableName, fieldName, filename, contentType);

			const req = httpMock.expectOne(
				(request) =>
					request.url === `/s3/upload-url/${connectionId}` &&
					request.params.get('tableName') === tableName &&
					request.params.get('fieldName') === fieldName,
			);
			expect(req.request.method).toBe('POST');
			expect(req.request.body).toEqual({ filename, contentType });
			req.flush(mockUploadUrlResponse);

			const result = await resultPromise;
			expect(result).toEqual(mockUploadUrlResponse);
		});

		it('should handle image upload', async () => {
			const imageFilename = 'photo.jpg';
			const imageContentType = 'image/jpeg';

			const resultPromise = service.getUploadUrl(connectionId, tableName, fieldName, imageFilename, imageContentType);

			const req = httpMock.expectOne((request) => request.url === `/s3/upload-url/${connectionId}`);
			expect(req.request.body).toEqual({
				filename: imageFilename,
				contentType: imageContentType,
			});
			req.flush(mockUploadUrlResponse);

			await resultPromise;
		});

		it('should show error alert on failure', async () => {
			const resultPromise = service.getUploadUrl(connectionId, tableName, fieldName, filename, contentType);

			const req = httpMock.expectOne((request) => request.url === `/s3/upload-url/${connectionId}`);
			req.flush(fakeError, { status: 400, statusText: 'Bad Request' });

			const result = await resultPromise;
			expect(result).toBeNull();
			expect(fakeNotifications.showAlert).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					abstract: 'Failed to get upload URL',
					details: fakeError.message,
				}),
				expect.any(Array),
			);
		});

		it('should return null on error', async () => {
			const resultPromise = service.getUploadUrl(connectionId, tableName, fieldName, filename, contentType);

			const req = httpMock.expectOne((request) => request.url === `/s3/upload-url/${connectionId}`);
			req.flush(fakeError, { status: 400, statusText: 'Bad Request' });

			const result = await resultPromise;
			expect(result).toBeNull();
		});
	});

	describe('uploadToS3', () => {
		const uploadUrl = 'https://s3.amazonaws.com/bucket/file.pdf?signature=abc123';

		it('should upload file to S3 successfully', async () => {
			const file = new File(['test content'], 'test.pdf', {
				type: 'application/pdf',
			});

			const resultPromise = service.uploadToS3(uploadUrl, file);

			const req = httpMock.expectOne(uploadUrl);
			expect(req.request.method).toBe('PUT');
			expect(req.request.headers.get('Content-Type')).toBe('application/pdf');
			expect(req.request.body).toBe(file);
			req.flush(null);

			const result = await resultPromise;
			expect(result).toBe(true);
		});

		it('should upload image file with correct content type', async () => {
			const file = new File(['image data'], 'photo.jpg', {
				type: 'image/jpeg',
			});

			const resultPromise = service.uploadToS3(uploadUrl, file);

			const req = httpMock.expectOne(uploadUrl);
			expect(req.request.headers.get('Content-Type')).toBe('image/jpeg');
			req.flush(null);

			await resultPromise;
		});

		it('should show error alert on upload failure', async () => {
			const file = new File(['test content'], 'test.pdf', {
				type: 'application/pdf',
			});

			const resultPromise = service.uploadToS3(uploadUrl, file);

			const req = httpMock.expectOne(uploadUrl);
			req.flush(null, { status: 500, statusText: 'Internal Server Error' });

			const result = await resultPromise;
			expect(result).toBe(false);
			expect(fakeNotifications.showAlert).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					abstract: 'File upload failed',
				}),
				expect.any(Array),
			);
		});

		it('should return false on error', async () => {
			const file = new File(['test content'], 'test.pdf', {
				type: 'application/pdf',
			});

			const resultPromise = service.uploadToS3(uploadUrl, file);

			const req = httpMock.expectOne(uploadUrl);
			req.flush(null, { status: 500, statusText: 'Internal Server Error' });

			const result = await resultPromise;
			expect(result).toBe(false);
		});
	});

	describe('uploadFile', () => {
		const connectionId = 'conn-123';
		const tableName = 'users';
		const fieldName = 'avatar';

		it('should get upload URL and upload file successfully', async () => {
			const file = new File(['test content'], 'test.pdf', {
				type: 'application/pdf',
			});

			const resultPromise = service.uploadFile(connectionId, tableName, fieldName, file);

			// First request: get upload URL
			const uploadUrlReq = httpMock.expectOne((request) => request.url === `/s3/upload-url/${connectionId}`);
			expect(uploadUrlReq.request.method).toBe('POST');
			expect(uploadUrlReq.request.body).toEqual({
				filename: 'test.pdf',
				contentType: 'application/pdf',
			});
			uploadUrlReq.flush(mockUploadUrlResponse);

			// Allow the first promise to resolve so the second request starts
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Second request: upload to S3
			const uploadReq = httpMock.expectOne(mockUploadUrlResponse.uploadUrl);
			expect(uploadReq.request.method).toBe('PUT');
			expect(uploadReq.request.body).toBe(file);
			uploadReq.flush(null);

			const result = await resultPromise;
			expect(result).toEqual({
				key: mockUploadUrlResponse.key,
				previewUrl: mockUploadUrlResponse.previewUrl,
			});
		});

		it('should return null if getting upload URL fails', async () => {
			const file = new File(['test content'], 'test.pdf', {
				type: 'application/pdf',
			});

			const resultPromise = service.uploadFile(connectionId, tableName, fieldName, file);

			const uploadUrlReq = httpMock.expectOne((request) => request.url === `/s3/upload-url/${connectionId}`);
			uploadUrlReq.flush(fakeError, { status: 400, statusText: 'Bad Request' });

			const result = await resultPromise;
			expect(result).toBeNull();
			expect(fakeNotifications.showAlert).toHaveBeenCalled();
		});

		it('should return null if S3 upload fails', async () => {
			const file = new File(['test content'], 'test.pdf', {
				type: 'application/pdf',
			});

			const resultPromise = service.uploadFile(connectionId, tableName, fieldName, file);

			// First request succeeds
			const uploadUrlReq = httpMock.expectOne((request) => request.url === `/s3/upload-url/${connectionId}`);
			uploadUrlReq.flush(mockUploadUrlResponse);

			// Allow the first promise to resolve so the second request starts
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Second request fails
			const uploadReq = httpMock.expectOne(mockUploadUrlResponse.uploadUrl);
			uploadReq.flush(null, { status: 500, statusText: 'Internal Server Error' });

			const result = await resultPromise;
			expect(result).toBeNull();
			expect(fakeNotifications.showAlert).toHaveBeenCalled();
		});
	});
});
