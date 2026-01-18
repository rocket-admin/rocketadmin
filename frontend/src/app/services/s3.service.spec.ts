import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { NotificationsService } from "./notifications.service";
import { S3Service } from "./s3.service";

describe("S3Service", () => {
	let service: S3Service;
	let httpMock: HttpTestingController;
	let fakeNotifications: { showAlert: ReturnType<typeof vi.fn>; dismissAlert: ReturnType<typeof vi.fn> };

	const mockFileUrlResponse = {
		url: "https://s3.amazonaws.com/bucket/file.pdf?signature=abc123",
		key: "prefix/file.pdf",
		expiresIn: 3600,
	};

	const mockUploadUrlResponse = {
		uploadUrl:
			"https://s3.amazonaws.com/bucket/prefix/newfile.pdf?signature=xyz789",
		key: "prefix/newfile.pdf",
		expiresIn: 3600,
	};

	const fakeError = {
		message: "Something went wrong",
		statusCode: 400,
	};

	beforeEach(() => {
		fakeNotifications = {
			showAlert: vi.fn(),
			dismissAlert: vi.fn()
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

	it("should be created", () => {
		expect(service).toBeTruthy();
	});

	describe("getFileUrl", () => {
		const connectionId = "conn-123";
		const tableName = "users";
		const fieldName = "avatar";
		const rowPrimaryKey = { id: 1 };

		it("should fetch file URL successfully", () => {
			let result: any;

			service
				.getFileUrl(connectionId, tableName, fieldName, rowPrimaryKey)
				.subscribe((res) => {
					result = res;
				});

			const req = httpMock.expectOne(
				(request) =>
					request.url === `/s3/file/${connectionId}` &&
					request.params.get("tableName") === tableName &&
					request.params.get("fieldName") === fieldName &&
					request.params.get("rowPrimaryKey") === JSON.stringify(rowPrimaryKey),
			);
			expect(req.request.method).toBe("GET");
			req.flush(mockFileUrlResponse);

			expect(result).toEqual(mockFileUrlResponse);
		});

		it("should handle complex primary key", () => {
			const complexPrimaryKey = { user_id: 1, org_id: "abc" };
			let result: any;

			service
				.getFileUrl(connectionId, tableName, fieldName, complexPrimaryKey)
				.subscribe((res) => {
					result = res;
				});

			const req = httpMock.expectOne(
				(request) =>
					request.url === `/s3/file/${connectionId}` &&
					request.params.get("rowPrimaryKey") ===
						JSON.stringify(complexPrimaryKey),
			);
			req.flush(mockFileUrlResponse);

			expect(result).toEqual(mockFileUrlResponse);
		});

		it("should show error alert on failure", async () => {
			const promise = service
				.getFileUrl(connectionId, tableName, fieldName, rowPrimaryKey)
				.toPromise();

			const req = httpMock.expectOne(
				(request) => request.url === `/s3/file/${connectionId}`,
			);
			req.flush(fakeError, { status: 400, statusText: "Bad Request" });

			await promise;

			expect(fakeNotifications.showAlert).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					abstract: "Failed to get S3 file URL",
					details: fakeError.message,
				}),
				expect.any(Array),
			);
		});

		it("should return EMPTY observable on error", async () => {
			let emitted = false;

			const promise = new Promise<void>((resolve) => {
				service
					.getFileUrl(connectionId, tableName, fieldName, rowPrimaryKey)
					.subscribe({
						next: () => {
							emitted = true;
						},
						complete: () => {
							resolve();
						},
					});
			});

			const req = httpMock.expectOne(
				(request) => request.url === `/s3/file/${connectionId}`,
			);
			req.flush(fakeError, { status: 400, statusText: "Bad Request" });

			await promise;
			expect(emitted).toBe(false);
		});
	});

	describe("getUploadUrl", () => {
		const connectionId = "conn-123";
		const tableName = "users";
		const fieldName = "avatar";
		const filename = "document.pdf";
		const contentType = "application/pdf";

		it("should fetch upload URL successfully", () => {
			let result: any;

			service
				.getUploadUrl(connectionId, tableName, fieldName, filename, contentType)
				.subscribe((res) => {
					result = res;
				});

			const req = httpMock.expectOne(
				(request) =>
					request.url === `/s3/upload-url/${connectionId}` &&
					request.params.get("tableName") === tableName &&
					request.params.get("fieldName") === fieldName,
			);
			expect(req.request.method).toBe("POST");
			expect(req.request.body).toEqual({ filename, contentType });
			req.flush(mockUploadUrlResponse);

			expect(result).toEqual(mockUploadUrlResponse);
		});

		it("should handle image upload", () => {
			const imageFilename = "photo.jpg";
			const imageContentType = "image/jpeg";

			service
				.getUploadUrl(
					connectionId,
					tableName,
					fieldName,
					imageFilename,
					imageContentType,
				)
				.subscribe();

			const req = httpMock.expectOne(
				(request) => request.url === `/s3/upload-url/${connectionId}`,
			);
			expect(req.request.body).toEqual({
				filename: imageFilename,
				contentType: imageContentType,
			});
			req.flush(mockUploadUrlResponse);
		});

		it("should show error alert on failure", async () => {
			const promise = service
				.getUploadUrl(connectionId, tableName, fieldName, filename, contentType)
				.toPromise();

			const req = httpMock.expectOne(
				(request) => request.url === `/s3/upload-url/${connectionId}`,
			);
			req.flush(fakeError, { status: 400, statusText: "Bad Request" });

			await promise;

			expect(fakeNotifications.showAlert).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					abstract: "Failed to get upload URL",
					details: fakeError.message,
				}),
				expect.any(Array),
			);
		});

		it("should return EMPTY observable on error", async () => {
			let emitted = false;

			const promise = new Promise<void>((resolve) => {
				service
					.getUploadUrl(connectionId, tableName, fieldName, filename, contentType)
					.subscribe({
						next: () => {
							emitted = true;
						},
						complete: () => {
							resolve();
						},
					});
			});

			const req = httpMock.expectOne(
				(request) => request.url === `/s3/upload-url/${connectionId}`,
			);
			req.flush(fakeError, { status: 400, statusText: "Bad Request" });

			await promise;
			expect(emitted).toBe(false);
		});
	});

	describe("uploadToS3", () => {
		const uploadUrl =
			"https://s3.amazonaws.com/bucket/file.pdf?signature=abc123";

		it("should upload file to S3 successfully", () => {
			const file = new File(["test content"], "test.pdf", {
				type: "application/pdf",
			});
			let completed = false;

			service.uploadToS3(uploadUrl, file).subscribe({
				complete: () => {
					completed = true;
				},
			});

			const req = httpMock.expectOne(uploadUrl);
			expect(req.request.method).toBe("PUT");
			expect(req.request.headers.get("Content-Type")).toBe("application/pdf");
			expect(req.request.body).toBe(file);
			req.flush(null);

			expect(completed).toBe(true);
		});

		it("should upload image file with correct content type", () => {
			const file = new File(["image data"], "photo.jpg", {
				type: "image/jpeg",
			});

			service.uploadToS3(uploadUrl, file).subscribe();

			const req = httpMock.expectOne(uploadUrl);
			expect(req.request.headers.get("Content-Type")).toBe("image/jpeg");
			req.flush(null);
		});

		it("should show error alert on upload failure", async () => {
			const file = new File(["test content"], "test.pdf", {
				type: "application/pdf",
			});
			const promise = service.uploadToS3(uploadUrl, file).toPromise();

			const req = httpMock.expectOne(uploadUrl);
			req.flush(null, { status: 500, statusText: "Internal Server Error" });

			await promise;

			expect(fakeNotifications.showAlert).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					abstract: "File upload failed",
				}),
				expect.any(Array),
			);
		});

		it("should return EMPTY observable on error", async () => {
			const file = new File(["test content"], "test.pdf", {
				type: "application/pdf",
			});
			let emitted = false;

			const promise = new Promise<void>((resolve) => {
				service.uploadToS3(uploadUrl, file).subscribe({
					next: () => {
						emitted = true;
					},
					complete: () => {
						resolve();
					},
				});
			});

			const req = httpMock.expectOne(uploadUrl);
			req.flush(null, { status: 500, statusText: "Internal Server Error" });

			await promise;
			expect(emitted).toBe(false);
		});
	});
});
