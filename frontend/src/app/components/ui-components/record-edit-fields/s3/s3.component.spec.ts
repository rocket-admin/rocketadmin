import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { WidgetStructure } from 'src/app/models/table';
import { ConnectionsService } from 'src/app/services/connections.service';
import { S3Service } from 'src/app/services/s3.service';
import { TablesService } from 'src/app/services/tables.service';
import { S3EditComponent } from './s3.component';

describe('S3EditComponent', () => {
	let component: S3EditComponent;
	let fixture: ComponentFixture<S3EditComponent>;
	let fakeS3Service: any;
	let fakeConnectionsService: any;
	let fakeTablesService: any;

	const mockWidgetStructure: WidgetStructure = {
		field_name: 'document',
		widget_type: 'S3',
		widget_params: {
			bucket: 'test-bucket',
			prefix: 'uploads/',
			region: 'us-east-1',
			aws_access_key_id_secret_name: 'aws-key',
			aws_secret_access_key_secret_name: 'aws-secret',
		},
		name: 'Document Upload',
		description: 'Upload documents to S3',
	};

	const mockWidgetStructureStringParams: WidgetStructure = {
		field_name: 'document',
		widget_type: 'S3',
		widget_params: JSON.stringify({
			bucket: 'test-bucket',
			prefix: 'uploads/',
			region: 'us-east-1',
			aws_access_key_id_secret_name: 'aws-key',
			aws_secret_access_key_secret_name: 'aws-secret',
		}) as any,
		name: 'Document Upload',
		description: 'Upload documents to S3',
	};

	const mockFileUrlResponse = {
		url: 'https://s3.amazonaws.com/bucket/file.pdf?signature=abc123',
		key: 'uploads/file.pdf',
		expiresIn: 3600,
	};

	const mockUploadResponse = {
		key: 'uploads/newfile.pdf',
		previewUrl: 'https://s3.amazonaws.com/bucket/uploads/newfile.pdf?preview=true',
	};

	beforeEach(async () => {
		fakeS3Service = {
			getFileUrl: vi.fn(),
			uploadFile: vi.fn(),
		} as any;
		fakeConnectionsService = {
			get currentConnectionID() {
				return 'conn-123';
			},
		} as any;
		fakeTablesService = {
			get currentTableName() {
				return 'users';
			},
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

		fixture.componentRef.setInput('key', 'document');
		fixture.componentRef.setInput('label', 'Document');
		fixture.componentRef.setInput('widgetStructure', mockWidgetStructure);
		fixture.componentRef.setInput('rowPrimaryKey', { id: 1 });
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	describe('ngOnInit', () => {
		it('should set connectionId and tableName from services', () => {
			fixture.detectChanges();

			expect((component as any).connectionId).toBe('conn-123');
			expect((component as any).tableName).toBe('users');
		});

		it('should parse widget params from object', () => {
			fixture.componentRef.setInput('widgetStructure', mockWidgetStructure);
			fixture.detectChanges();

			expect(component.params()).toEqual({
				bucket: 'test-bucket',
				prefix: 'uploads/',
				region: 'us-east-1',
				aws_access_key_id_secret_name: 'aws-key',
				aws_secret_access_key_secret_name: 'aws-secret',
			});
		});

		it('should parse widget params from string', () => {
			fixture.componentRef.setInput('widgetStructure', mockWidgetStructureStringParams);
			fixture.detectChanges();

			expect(component.params()?.bucket).toBe('test-bucket');
		});

		it('should load preview if value is present', () => {
			fixture.componentRef.setInput('value', 'uploads/existing-file.pdf');
			fakeS3Service.getFileUrl.mockResolvedValue(mockFileUrlResponse);

			fixture.detectChanges();

			expect(fakeS3Service.getFileUrl).toHaveBeenCalledWith('conn-123', 'users', 'document', { id: 1 });
		});

		it('should not load preview if value is empty', () => {
			fixture.componentRef.setInput('value', '');
			fixture.detectChanges();

			expect(fakeS3Service.getFileUrl).not.toHaveBeenCalled();
		});
	});

	describe('effect-based change detection', () => {
		it('should load preview when value changes and no preview exists', async () => {
			fixture.detectChanges();
			fakeS3Service.getFileUrl.mockResolvedValue(mockFileUrlResponse);

			fixture.componentRef.setInput('value', 'uploads/new-file.pdf');
			fixture.detectChanges();
			await fixture.whenStable();

			expect(fakeS3Service.getFileUrl).toHaveBeenCalled();
		});

		it('should not reload preview if already loading', () => {
			fixture.detectChanges();
			component.isLoading.set(true);
			fakeS3Service.getFileUrl.mockClear();

			fixture.componentRef.setInput('value', 'uploads/file.pdf');
			fixture.detectChanges();

			expect(fakeS3Service.getFileUrl).not.toHaveBeenCalled();
		});

		it('should not reload preview if preview already exists', () => {
			fixture.detectChanges();
			component.previewUrl.set('https://example.com/preview');
			fakeS3Service.getFileUrl.mockClear();

			fixture.componentRef.setInput('value', 'uploads/file.pdf');
			fixture.detectChanges();

			expect(fakeS3Service.getFileUrl).not.toHaveBeenCalled();
		});
	});

	describe('onFileSelected', () => {
		it('should upload file and update value on success', async () => {
			fixture.detectChanges();
			fakeS3Service.uploadFile.mockResolvedValue(mockUploadResponse);

			const file = new File(['test content'], 'test.pdf', {
				type: 'application/pdf',
			});
			const event = {
				target: {
					files: [file],
				},
			} as unknown as Event;

			vi.spyOn(component.onFieldChange, 'emit');
			await component.onFileSelected(event);
			await fixture.whenStable();

			expect(fakeS3Service.uploadFile).toHaveBeenCalledWith('conn-123', 'users', 'document', file);
			expect(component.internalValue()).toBe('uploads/newfile.pdf');
			expect(component.onFieldChange.emit).toHaveBeenCalledWith('uploads/newfile.pdf');
		});

		it('should do nothing if no files selected', async () => {
			fixture.detectChanges();
			const event = {
				target: {
					files: [],
				},
			} as unknown as Event;

			await component.onFileSelected(event);

			expect(fakeS3Service.uploadFile).not.toHaveBeenCalled();
		});

		it('should do nothing if files is null', async () => {
			fixture.detectChanges();
			const event = {
				target: {
					files: null,
				},
			} as unknown as Event;

			await component.onFileSelected(event);

			expect(fakeS3Service.uploadFile).not.toHaveBeenCalled();
		});

		it('should set isLoading to true during upload', async () => {
			fixture.detectChanges();
			let resolveUpload: (value: { key: string; previewUrl: string }) => void;
			const pendingPromise = new Promise<{ key: string; previewUrl: string }>((resolve) => {
				resolveUpload = resolve;
			});
			fakeS3Service.uploadFile.mockReturnValue(pendingPromise);

			const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
			const event = { target: { files: [file] } } as unknown as Event;

			const uploadPromise = component.onFileSelected(event);

			expect(component.isLoading()).toBe(true);

			resolveUpload!(mockUploadResponse);
			await uploadPromise;
		});

		it('should set isLoading to false when upload returns null', async () => {
			fixture.detectChanges();
			fakeS3Service.uploadFile.mockResolvedValue(null);

			const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
			const event = { target: { files: [file] } } as unknown as Event;

			await component.onFileSelected(event);
			await fixture.whenStable();

			expect(component.isLoading()).toBe(false);
		});
	});

	describe('openFile', () => {
		it('should open preview URL in new tab', () => {
			fixture.detectChanges();
			component.previewUrl.set('https://s3.amazonaws.com/bucket/file.pdf');
			vi.spyOn(window, 'open');

			component.openFile();

			expect(window.open).toHaveBeenCalledWith('https://s3.amazonaws.com/bucket/file.pdf', '_blank');
		});

		it('should not open if previewUrl is null', () => {
			fixture.detectChanges();
			component.previewUrl.set(null);
			vi.spyOn(window, 'open');

			component.openFile();

			expect(window.open).not.toHaveBeenCalled();
		});
	});

	describe('isImage computed signal', () => {
		const imageTestCases = [
			{ value: 'photo.jpg', expected: true },
			{ value: 'photo.JPG', expected: true },
			{ value: 'photo.jpeg', expected: true },
			{ value: 'photo.png', expected: true },
			{ value: 'photo.gif', expected: true },
			{ value: 'photo.webp', expected: true },
			{ value: 'photo.svg', expected: true },
			{ value: 'photo.bmp', expected: true },
			{ value: 'document.pdf', expected: false },
			{ value: 'document.doc', expected: false },
			{ value: 'data.csv', expected: false },
			{ value: 'archive.zip', expected: false },
			{ value: 'uploads/folder/photo.png', expected: true },
			{ value: 'file-without-extension', expected: false },
		];

		imageTestCases.forEach(({ value, expected }) => {
			it(`should return ${expected} for "${value}"`, () => {
				fixture.componentRef.setInput('value', value);
				fixture.detectChanges();

				expect(component.isImage()).toBe(expected);
			});
		});
	});

	describe('_loadPreview', () => {
		it('should set previewUrl on successful load', async () => {
			fixture.componentRef.setInput('value', 'uploads/photo.jpg');
			fakeS3Service.getFileUrl.mockResolvedValue(mockFileUrlResponse);

			fixture.detectChanges();
			await fixture.whenStable();

			expect(component.previewUrl()).toBe(mockFileUrlResponse.url);
			expect(component.isLoading()).toBe(false);
		});

		it('should not load preview if value is empty', () => {
			fixture.componentRef.setInput('value', '');
			fixture.detectChanges();

			expect(fakeS3Service.getFileUrl).not.toHaveBeenCalled();
		});

		it('should not load preview if connectionId is missing', async () => {
			(component as any).connectionId = '';
			fixture.componentRef.setInput('value', 'uploads/file.pdf');
			await (component as any)._loadPreview();

			expect(fakeS3Service.getFileUrl).not.toHaveBeenCalled();
		});

		it('should not load preview if tableName is missing', async () => {
			fixture.detectChanges();
			(component as any).tableName = '';
			fakeS3Service.getFileUrl.mockClear();

			await (component as any)._loadPreview();

			expect(fakeS3Service.getFileUrl).not.toHaveBeenCalled();
		});

		it('should not load preview if rowPrimaryKey is missing', () => {
			fixture.componentRef.setInput('rowPrimaryKey', null);
			fixture.componentRef.setInput('value', 'uploads/file.pdf');
			fixture.detectChanges();

			expect(fakeS3Service.getFileUrl).not.toHaveBeenCalled();
		});

		it('should set isLoading to false when getFileUrl returns null', async () => {
			fixture.componentRef.setInput('value', 'uploads/file.pdf');
			fakeS3Service.getFileUrl.mockResolvedValue(null);

			fixture.detectChanges();
			await fixture.whenStable();

			expect(component.isLoading()).toBe(false);
		});
	});

	describe('params computed signal', () => {
		it('should handle undefined widgetStructure gracefully', () => {
			fixture.componentRef.setInput('widgetStructure', undefined);
			fixture.detectChanges();

			expect(component.params()).toBeNull();
		});

		it('should handle null widget_params gracefully', () => {
			fixture.componentRef.setInput('widgetStructure', {
				...mockWidgetStructure,
				widget_params: null as any,
			});
			fixture.detectChanges();

			expect(component.params()).toBeNull();
		});

		it('should handle invalid JSON string gracefully', () => {
			fixture.componentRef.setInput('widgetStructure', {
				...mockWidgetStructure,
				widget_params: 'invalid json' as any,
			});
			fixture.detectChanges();

			expect(component.params()).toBeNull();
		});
	});

	describe('template integration', () => {
		beforeEach(() => {
			fixture.detectChanges();
		});

		it('should display label in form field', () => {
			const label = fixture.nativeElement.querySelector('mat-label');
			expect(label.textContent).toContain('Document');
		});

		it('should show upload button', () => {
			const uploadButton = fixture.nativeElement.querySelector('button');
			expect(uploadButton.textContent).toContain('Upload');
		});

		it('should disable upload button when disabled', () => {
			fixture.componentRef.setInput('disabled', true);
			fixture.detectChanges();

			const uploadButton = fixture.nativeElement.querySelector('button');
			expect(uploadButton.disabled).toBe(true);
		});

		it('should disable upload button when readonly', () => {
			fixture.componentRef.setInput('readonly', true);
			fixture.detectChanges();

			const uploadButton = fixture.nativeElement.querySelector('button');
			expect(uploadButton.disabled).toBe(true);
		});

		it('should disable upload button when loading', () => {
			component.isLoading.set(true);
			fixture.detectChanges();

			const uploadButton = fixture.nativeElement.querySelector('button');
			expect(uploadButton.disabled).toBe(true);
		});

		it('should show open button when previewUrl exists', () => {
			component.previewUrl.set('https://example.com/file.pdf');
			fixture.detectChanges();

			const buttons = fixture.nativeElement.querySelectorAll('button');
			const openButton = Array.from(buttons).find((b: any) => b.textContent.includes('Open'));
			expect(openButton).toBeTruthy();
		});

		it('should not show open button when previewUrl is null', () => {
			component.previewUrl.set(null);
			fixture.detectChanges();

			const buttons = fixture.nativeElement.querySelectorAll('button');
			const openButton = Array.from(buttons).find((b: any) => b.textContent.includes('Open'));
			expect(openButton).toBeFalsy();
		});

		it('should show spinner when loading', () => {
			fixture.componentRef.setInput('value', 'uploads/file.pdf');
			component.isLoading.set(true);
			fixture.detectChanges();

			const spinner = fixture.nativeElement.querySelector('mat-spinner');
			expect(spinner).toBeTruthy();
		});

		it('should show image preview for image files', () => {
			fixture.componentRef.setInput('value', 'uploads/photo.jpg');
			component.previewUrl.set('https://example.com/photo.jpg');
			component.isLoading.set(false);
			fixture.detectChanges();

			const img = fixture.nativeElement.querySelector('.s3-widget__thumbnail');
			expect(img).toBeTruthy();
			expect(img.src).toBe('https://example.com/photo.jpg');
		});

		it('should show file icon for non-image files', () => {
			fixture.componentRef.setInput('value', 'uploads/document.pdf');
			component.previewUrl.set('https://example.com/document.pdf');
			component.isLoading.set(false);
			fixture.detectChanges();

			const fileIcon = fixture.nativeElement.querySelector('.s3-widget__file-icon');
			expect(fileIcon).toBeTruthy();
		});

		it('should show truncated filename for long filenames', () => {
			fixture.componentRef.setInput('value', 'uploads/very-long-filename-that-should-be-truncated.pdf');
			component.previewUrl.set('https://example.com/file.pdf');
			component.isLoading.set(false);
			fixture.detectChanges();

			const filename = fixture.nativeElement.querySelector('.s3-widget__filename');
			expect(filename).toBeTruthy();
		});
	});

	describe('onValueChange', () => {
		it('should update internalValue and emit change', () => {
			fixture.detectChanges();
			vi.spyOn(component.onFieldChange, 'emit');

			component.onValueChange('new-value.pdf');

			expect(component.internalValue()).toBe('new-value.pdf');
			expect(component.onFieldChange.emit).toHaveBeenCalledWith('new-value.pdf');
		});
	});
});
