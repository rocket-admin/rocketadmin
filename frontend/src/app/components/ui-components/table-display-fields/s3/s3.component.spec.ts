import { ComponentFixture, TestBed } from '@angular/core/testing';
import { S3DisplayComponent } from './s3.component';
import { S3Service } from 'src/app/services/s3.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { TablesService } from 'src/app/services/tables.service';
import { vi } from 'vitest';

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
				aws_access_key_id_secret_name: 'key',
				aws_secret_access_key_secret_name: 'secret',
				type: 'image',
			},
		});
		component.ngOnInit();
		expect(component.isImageType).toBe(true);
	});
});
