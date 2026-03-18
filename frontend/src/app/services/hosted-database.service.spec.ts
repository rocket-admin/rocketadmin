import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CreatedHostedDatabase, CreateHostedDatabaseConnectionPayload } from '../models/hosted-database';
import { HostedDatabaseService } from './hosted-database.service';

describe('HostedDatabaseService', () => {
	let httpMock: HttpTestingController;
	let service: HostedDatabaseService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting(), HostedDatabaseService],
		});

		httpMock = TestBed.inject(HttpTestingController);
		service = TestBed.inject(HostedDatabaseService);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('should create a hosted database for a company', () => {
		const response: CreatedHostedDatabase = {
			id: 'hosted-db-id',
			companyId: 'company-id',
			databaseName: 'rocketadmin_hosted',
			hostname: 'db.rocketadmin.com',
			port: 5432,
			username: 'postgres',
			password: 'secret',
			createdAt: '2026-03-18T00:00:00.000Z',
		};

		service.createHostedDatabase('company-id').subscribe((result) => {
			expect(result).toEqual(response);
		});

		const request = httpMock.expectOne('/saas/hosted-database/create/company-id');
		expect(request.request.method).toBe('POST');
		expect(request.request.body).toEqual({});
		request.flush(response);
	});

	it('should create a RocketAdmin connection for a hosted database', () => {
		const payload: CreateHostedDatabaseConnectionPayload = {
			companyId: 'company-id',
			userId: 'user-id',
			databaseName: 'rocketadmin_hosted',
			hostname: 'db.rocketadmin.com',
			port: 5432,
			username: 'postgres',
			password: 'secret',
		};

		service.createConnectionForHostedDatabase(payload).subscribe((result) => {
			expect(result).toEqual({ id: 'connection-id' });
		});

		const request = httpMock.expectOne('/saas/connection/hosted');
		expect(request.request.method).toBe('POST');
		expect(request.request.body).toEqual(payload);
		request.flush({ id: 'connection-id' });
	});
});
