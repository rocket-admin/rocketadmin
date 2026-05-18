import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConnectionsService } from 'src/app/services/connections.service';
import { S3Service } from 'src/app/services/s3.service';
import { TablesService } from 'src/app/services/tables.service';
import { vi } from 'vitest';
import { S3DisplayComponent } from './s3.component';

describe('S3DisplayComponent', () => {
	let component: S3DisplayComponent;
	let fixture: ComponentFixture<S3DisplayComponent>;

	const mockS3Service: Partial<S3Service> = {
		getFileUrl: vi.fn(),
	};

	const mockConnectionsService: Partial<ConnectionsService> = {
		currentConnectionID: 'test-conn',
	};

	const mockTablesService: Partial<TablesService> = {
		currentTableName: 'test-table',
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [S3DisplayComponent],
			providers: [
				{ provide: S3Service, useValue: mockS3Service },
				{ provide: ConnectionsService, useValue: mockConnectionsService },
				{ provide: TablesService, useValue: mockTablesService },
			],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(S3DisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should detect image type from widget params', () => {
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: {
				bucket: 'my-bucket',
				access_key_id: 'COMPANY-SECRET/bucket-access-key-id',
				access_key: 'COMPANY-SECRET/bucket-access-key',
				type: 'image',
			},
		});
		component.ngOnInit();
		expect(component.isImageType).toBe(true);
	});
});
