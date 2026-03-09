import { ComponentFixture, TestBed } from '@angular/core/testing';
import { S3RecordViewComponent } from './s3.component';
import { S3Service } from 'src/app/services/s3.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { TablesService } from 'src/app/services/tables.service';

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
		component.widgetStructure = {
			widget_params: {
				bucket: 'my-bucket',
				type: 'file',
				aws_access_key_id_secret_name: 'key',
				aws_secret_access_key_secret_name: 'secret',
			},
		} as any;
		component.ngOnInit();
		expect(component.params).toBeDefined();
		expect(component.params.bucket).toBe('my-bucket');
	});

	it('should identify image type', () => {
		component.widgetStructure = {
			widget_params: {
				bucket: 'my-bucket',
				type: 'image',
				aws_access_key_id_secret_name: 'key',
				aws_secret_access_key_secret_name: 'secret',
			},
		} as any;
		component.ngOnInit();
		expect(component.isImageType).toBe(true);
	});
});
