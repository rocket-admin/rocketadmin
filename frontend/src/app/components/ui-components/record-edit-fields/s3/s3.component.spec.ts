import {
	ComponentFixture,
	fakeAsync,
	TestBed,
	tick,
} from "@angular/core/testing";
import { FormsModule } from "@angular/forms";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { of, Subject, throwError } from "rxjs";
import { WidgetStructure } from "src/app/models/table";
import { ConnectionsService } from "src/app/services/connections.service";
import { S3Service } from "src/app/services/s3.service";
import { TablesService } from "src/app/services/tables.service";
import { S3EditComponent } from "./s3.component";

describe("S3EditComponent", () => {
	let component: S3EditComponent;
	let fixture: ComponentFixture<S3EditComponent>;
	let fakeS3Service: any;
	let fakeConnectionsService: any;
	let fakeTablesService: any;

	const mockWidgetStructure: WidgetStructure = {
		field_name: "document",
		widget_type: "S3",
		widget_params: {
			bucket: "test-bucket",
			prefix: "uploads/",
			region: "us-east-1",
			aws_access_key_id_secret_name: "aws-key",
			aws_secret_access_key_secret_name: "aws-secret",
		},
		name: "Document Upload",
		description: "Upload documents to S3",
	};

	const mockWidgetStructureStringParams: WidgetStructure = {
		field_name: "document",
		widget_type: "S3",
		widget_params: JSON.stringify({
			bucket: "test-bucket",
			prefix: "uploads/",
			region: "us-east-1",
			aws_access_key_id_secret_name: "aws-key",
			aws_secret_access_key_secret_name: "aws-secret",
		}) as any,
		name: "Document Upload",
		description: "Upload documents to S3",
	};

	const mockFileUrlResponse = {
		url: "https://s3.amazonaws.com/bucket/file.pdf?signature=abc123",
		key: "uploads/file.pdf",
		expiresIn: 3600,
	};

	const mockUploadUrlResponse = {
		uploadUrl:
			"https://s3.amazonaws.com/bucket/uploads/newfile.pdf?signature=xyz789",
		key: "uploads/newfile.pdf",
		expiresIn: 3600,
	};

	beforeEach(async () => {
		fakeS3Service = {
			getFileUrl: vi.fn(),
			getUploadUrl: vi.fn(),
			uploadToS3: vi.fn(),
		} as any;
		fakeConnectionsService = {
			get currentConnectionID() { return "conn-123"; }
		} as any;
		fakeTablesService = {
			get currentTableName() { return "users"; }
		} as any;

		await TestBed.configureTestingModule({
			imports: [FormsModule, BrowserAnimationsModule, S3EditComponent],
			providers: [
				{ provide: S3Service, useValue: fakeS3Service },
				{ provide: ConnectionsService, useValue: fakeConnectionsService },
				{ provide: TablesService, useValue: fakeTablesService },
			],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(S3EditComponent);
		component = fixture.componentInstance;

		component.key = "document";
		component.label = "Document";
		component.widgetStructure = mockWidgetStructure;
		component.rowPrimaryKey = { id: 1 };
	});

	it("should create", () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	describe("ngOnInit", () => {
		it("should set connectionId and tableName from services", () => {
			fixture.detectChanges();

			expect((component as any).connectionId).toBe("conn-123");
			expect((component as any).tableName).toBe("users");
		});

		it("should parse widget params from object", () => {
			component.widgetStructure = mockWidgetStructure;
			fixture.detectChanges();

			expect(component.params).toEqual({
				bucket: "test-bucket",
				prefix: "uploads/",
				region: "us-east-1",
				aws_access_key_id_secret_name: "aws-key",
				aws_secret_access_key_secret_name: "aws-secret",
			});
		});

		it("should parse widget params from string", () => {
			component.widgetStructure = mockWidgetStructureStringParams;
			fixture.detectChanges();

			expect(component.params.bucket).toBe("test-bucket");
		});

		it("should load preview if value is present", () => {
			component.value = "uploads/existing-file.pdf";
			fakeS3Service.getFileUrl.mockReturnValue(of(mockFileUrlResponse));

			fixture.detectChanges();

			expect(fakeS3Service.getFileUrl).toHaveBeenCalledWith(
				"conn-123",
				"users",
				"document",
				{ id: 1 },
			);
		});

		it("should not load preview if value is empty", () => {
			component.value = "";
			fixture.detectChanges();

			expect(fakeS3Service.getFileUrl).not.toHaveBeenCalled();
		});
	});

	describe("ngOnChanges", () => {
		it("should load preview when value changes and no preview exists", () => {
			fixture.detectChanges();
			fakeS3Service.getFileUrl.mockReturnValue(of(mockFileUrlResponse));

			component.value = "uploads/new-file.pdf";
			component.ngOnChanges();

			expect(fakeS3Service.getFileUrl).toHaveBeenCalled();
		});

		it("should not reload preview if already loading", () => {
			fixture.detectChanges();
			component.isLoading = true;
			component.value = "uploads/file.pdf";

			component.ngOnChanges();

			expect(fakeS3Service.getFileUrl).not.toHaveBeenCalled();
		});

		it("should not reload preview if preview already exists", () => {
			fixture.detectChanges();
			component.previewUrl = "https://example.com/preview";
			component.value = "uploads/file.pdf";

			component.ngOnChanges();

			expect(fakeS3Service.getFileUrl).not.toHaveBeenCalled();
		});
	});

	describe("onFileSelected", () => {
		it("should upload file and update value on success", fakeAsync(() => {
			fixture.detectChanges();
			fakeS3Service.getUploadUrl.mockReturnValue(of(mockUploadUrlResponse));
			fakeS3Service.uploadToS3.mockReturnValue(of(undefined));
			fakeS3Service.getFileUrl.mockReturnValue(of(mockFileUrlResponse));

			const file = new File(["test content"], "test.pdf", {
				type: "application/pdf",
			});
			const event = {
				target: {
					files: [file],
				},
			} as unknown as Event;

			vi.spyOn(component.onFieldChange, "emit");
			component.onFileSelected(event);
			tick();

			expect(fakeS3Service.getUploadUrl).toHaveBeenCalledWith(
				"conn-123",
				"users",
				"document",
				"test.pdf",
				"application/pdf",
			);
			expect(fakeS3Service.uploadToS3).toHaveBeenCalledWith(
				mockUploadUrlResponse.uploadUrl,
				file,
			);
			expect(component.value).toBe("uploads/newfile.pdf");
			expect(component.onFieldChange.emit).toHaveBeenCalledWith(
				"uploads/newfile.pdf",
			);
		}));

		it("should do nothing if no files selected", () => {
			fixture.detectChanges();
			const event = {
				target: {
					files: [],
				},
			} as unknown as Event;

			component.onFileSelected(event);

			expect(fakeS3Service.getUploadUrl).not.toHaveBeenCalled();
		});

		it("should do nothing if files is null", () => {
			fixture.detectChanges();
			const event = {
				target: {
					files: null,
				},
			} as unknown as Event;

			component.onFileSelected(event);

			expect(fakeS3Service.getUploadUrl).not.toHaveBeenCalled();
		});

		it("should set isLoading to true during upload", () => {
			fixture.detectChanges();
			fakeS3Service.getUploadUrl.mockReturnValue(of(mockUploadUrlResponse));
			// Use a Subject that never emits to keep the upload "in progress"
			const pendingUpload$ = new Subject<void>();
			fakeS3Service.uploadToS3.mockReturnValue(pendingUpload$.asObservable());

			const file = new File(["test"], "test.pdf", { type: "application/pdf" });
			const event = { target: { files: [file] } } as unknown as Event;

			component.onFileSelected(event);

			expect(component.isLoading).toBe(true);
		});

		it("should set isLoading to false on getUploadUrl error", fakeAsync(() => {
			fixture.detectChanges();
			fakeS3Service.getUploadUrl.mockReturnValue(
				throwError(() => new Error("Upload URL error")),
			);

			const file = new File(["test"], "test.pdf", { type: "application/pdf" });
			const event = { target: { files: [file] } } as unknown as Event;

			component.onFileSelected(event);
			tick();

			expect(component.isLoading).toBe(false);
		}));

		it("should set isLoading to false on uploadToS3 error", fakeAsync(() => {
			fixture.detectChanges();
			fakeS3Service.getUploadUrl.mockReturnValue(of(mockUploadUrlResponse));
			fakeS3Service.uploadToS3.mockReturnValue(
				throwError(() => new Error("S3 upload error")),
			);

			const file = new File(["test"], "test.pdf", { type: "application/pdf" });
			const event = { target: { files: [file] } } as unknown as Event;

			component.onFileSelected(event);
			tick();

			expect(component.isLoading).toBe(false);
		}));
	});

	describe("openFile", () => {
		it("should open preview URL in new tab", () => {
			fixture.detectChanges();
			component.previewUrl = "https://s3.amazonaws.com/bucket/file.pdf";
			vi.spyOn(window, "open");

			component.openFile();

			expect(window.open).toHaveBeenCalledWith(
				"https://s3.amazonaws.com/bucket/file.pdf",
				"_blank",
			);
		});

		it("should not open if previewUrl is null", () => {
			fixture.detectChanges();
			component.previewUrl = null;
			vi.spyOn(window, "open");

			component.openFile();

			expect(window.open).not.toHaveBeenCalled();
		});
	});

	describe("_isImageFile", () => {
		const testCases = [
			{ key: "photo.jpg", expected: true },
			{ key: "photo.JPG", expected: true },
			{ key: "photo.jpeg", expected: true },
			{ key: "photo.png", expected: true },
			{ key: "photo.gif", expected: true },
			{ key: "photo.webp", expected: true },
			{ key: "photo.svg", expected: true },
			{ key: "photo.bmp", expected: true },
			{ key: "document.pdf", expected: false },
			{ key: "document.doc", expected: false },
			{ key: "data.csv", expected: false },
			{ key: "archive.zip", expected: false },
			{ key: "uploads/folder/photo.png", expected: true },
			{ key: "file-without-extension", expected: false },
		];

		testCases.forEach(({ key, expected }) => {
			it(`should return ${expected} for "${key}"`, () => {
				fixture.detectChanges();
				const result = (component as any)._isImageFile(key);
				expect(result).toBe(expected);
			});
		});
	});

	describe("_loadPreview", () => {
		it("should set previewUrl and isImage on successful load", fakeAsync(() => {
			component.value = "uploads/photo.jpg";
			fakeS3Service.getFileUrl.mockReturnValue(of(mockFileUrlResponse));

			fixture.detectChanges();
			tick();

			expect(component.previewUrl).toBe(mockFileUrlResponse.url);
			expect(component.isImage).toBe(true);
			expect(component.isLoading).toBe(false);
		}));

		it("should set isImage to false for non-image files", fakeAsync(() => {
			component.value = "uploads/document.pdf";
			fakeS3Service.getFileUrl.mockReturnValue(of(mockFileUrlResponse));

			fixture.detectChanges();
			tick();

			expect(component.isImage).toBe(false);
		}));

		it("should not load preview if value is empty", () => {
			component.value = "";
			fixture.detectChanges();

			expect(fakeS3Service.getFileUrl).not.toHaveBeenCalled();
		});

		it("should not load preview if connectionId is missing", () => {
			(component as any).connectionId = "";
			component.value = "uploads/file.pdf";
			(component as any)._loadPreview();

			expect(fakeS3Service.getFileUrl).not.toHaveBeenCalled();
		});

		it("should not load preview if tableName is missing", () => {
			fixture.detectChanges();
			(component as any).tableName = "";
			component.value = "uploads/file.pdf";
			fakeS3Service.getFileUrl.mockClear();

			(component as any)._loadPreview();

			expect(fakeS3Service.getFileUrl).not.toHaveBeenCalled();
		});

		it("should not load preview if rowPrimaryKey is missing", () => {
			component.rowPrimaryKey = null as any;
			component.value = "uploads/file.pdf";
			fixture.detectChanges();

			expect(fakeS3Service.getFileUrl).not.toHaveBeenCalled();
		});

		it("should set isLoading to false on error", fakeAsync(() => {
			component.value = "uploads/file.pdf";
			fakeS3Service.getFileUrl.mockReturnValue(
				throwError(() => new Error("File URL error")),
			);

			fixture.detectChanges();
			tick();

			expect(component.isLoading).toBe(false);
		}));
	});

	describe("_parseWidgetParams", () => {
		it("should handle undefined widgetStructure gracefully", () => {
			component.widgetStructure = undefined as any;
			fixture.detectChanges();

			expect(component.params).toBeUndefined();
		});

		it("should handle null widget_params gracefully", () => {
			component.widgetStructure = {
				...mockWidgetStructure,
				widget_params: null as any,
			};
			fixture.detectChanges();

			expect(component.params).toBeUndefined();
		});

		it("should handle invalid JSON string gracefully", () => {
			vi.spyOn(console, "error");
			component.widgetStructure = {
				...mockWidgetStructure,
				widget_params: "invalid json" as any,
			};
			fixture.detectChanges();

			expect(console.error).toHaveBeenCalled();
		});
	});

	describe("template integration", () => {
		beforeEach(() => {
			fixture.detectChanges();
		});

		it("should display label in form field", () => {
			const label = fixture.nativeElement.querySelector("mat-label");
			expect(label.textContent).toContain("Document");
		});

		it("should show upload button", () => {
			const uploadButton = fixture.nativeElement.querySelector("button");
			expect(uploadButton.textContent).toContain("Upload");
		});

		it("should disable upload button when disabled", () => {
			component.disabled = true;
			fixture.detectChanges();

			const uploadButton = fixture.nativeElement.querySelector("button");
			expect(uploadButton.disabled).toBe(true);
		});

		it("should disable upload button when readonly", () => {
			component.readonly = true;
			fixture.detectChanges();

			const uploadButton = fixture.nativeElement.querySelector("button");
			expect(uploadButton.disabled).toBe(true);
		});

		it("should disable upload button when loading", () => {
			component.isLoading = true;
			fixture.detectChanges();

			const uploadButton = fixture.nativeElement.querySelector("button");
			expect(uploadButton.disabled).toBe(true);
		});

		it("should show open button when previewUrl exists", () => {
			component.previewUrl = "https://example.com/file.pdf";
			fixture.detectChanges();

			const buttons = fixture.nativeElement.querySelectorAll("button");
			const openButton = Array.from(buttons).find((b: any) =>
				b.textContent.includes("Open"),
			);
			expect(openButton).toBeTruthy();
		});

		it("should not show open button when previewUrl is null", () => {
			component.previewUrl = null;
			fixture.detectChanges();

			const buttons = fixture.nativeElement.querySelectorAll("button");
			const openButton = Array.from(buttons).find((b: any) =>
				b.textContent.includes("Open"),
			);
			expect(openButton).toBeFalsy();
		});

		it("should show spinner when loading", () => {
			component.value = "uploads/file.pdf";
			component.isLoading = true;
			fixture.detectChanges();

			const spinner = fixture.nativeElement.querySelector("mat-spinner");
			expect(spinner).toBeTruthy();
		});

		it("should show image preview for image files", () => {
			component.value = "uploads/photo.jpg";
			component.isImage = true;
			component.previewUrl = "https://example.com/photo.jpg";
			component.isLoading = false;
			fixture.detectChanges();

			const img = fixture.nativeElement.querySelector(".s3-widget__thumbnail");
			expect(img).toBeTruthy();
			expect(img.src).toBe("https://example.com/photo.jpg");
		});

		it("should show file icon for non-image files", () => {
			component.value = "uploads/document.pdf";
			component.isImage = false;
			component.previewUrl = "https://example.com/document.pdf";
			component.isLoading = false;
			fixture.detectChanges();

			const fileIcon = fixture.nativeElement.querySelector(
				".s3-widget__file-icon",
			);
			expect(fileIcon).toBeTruthy();
		});

		it("should show truncated filename for long filenames", () => {
			component.value =
				"uploads/very-long-filename-that-should-be-truncated.pdf";
			component.isImage = false;
			component.previewUrl = "https://example.com/file.pdf";
			component.isLoading = false;
			fixture.detectChanges();

			const filename = fixture.nativeElement.querySelector(
				".s3-widget__filename",
			);
			expect(filename).toBeTruthy();
		});
	});
});
