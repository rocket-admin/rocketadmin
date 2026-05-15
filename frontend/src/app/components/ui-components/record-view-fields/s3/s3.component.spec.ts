import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConnectionsService } from 'src/app/services/connections.service';
import { S3Service } from 'src/app/services/s3.service';
import { TablesService } from 'src/app/services/tables.service';
import { S3RecordViewComponent } from './s3.component';

describe('S3RecordViewComponent', () => {
	let component: S3RecordViewComponent;
	let fixture: ComponentFixture<S3RecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [S3RecordViewComponent],
			providers: [
				{
					provide: S3Service,
					useValue: {
						getFileUrl: () => Promise.resolve({ url: 'https://s3.example.com/file.jpg' }),
					},
				},
				{
					provide: ConnectionsService,
					useValue: { currentConnectionID: 'conn-1' },
				},
				{
					provide: TablesService,
					useValue: { currentTableName: 'test_table' },
				},
			],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(S3RecordViewComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should parse widget params', () => {
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: {
				bucket: 'my-bucket',
				type: 'file',
				access_key_id: 'COMPANY-SECRET/bucket-access-key-id',
				access_key: 'COMPANY-SECRET/bucket-access-key',
			},
		});
		component.ngOnInit();
		expect(component.params).toBeDefined();
		expect(component.params.bucket).toBe('my-bucket');
	});

	it('should identify image type', () => {
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: {
				bucket: 'my-bucket',
				type: 'image',
				access_key_id: 'COMPANY-SECRET/bucket-access-key-id',
				access_key: 'COMPANY-SECRET/bucket-access-key',
			},
		});
		component.ngOnInit();
		expect(component.isImageType).toBe(true);
	});
});
