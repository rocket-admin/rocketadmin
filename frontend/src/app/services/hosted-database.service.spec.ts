import { TestBed } from '@angular/core/testing';
import { CreatedHostedDatabase } from '../models/hosted-database';
import { ApiService } from './api.service';
import { HostedDatabaseService } from './hosted-database.service';

describe('HostedDatabaseService', () => {
	let service: HostedDatabaseService;
	let apiService: { post: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		apiService = {
			post: vi.fn(),
		};

		TestBed.configureTestingModule({
			providers: [HostedDatabaseService, { provide: ApiService, useValue: apiService }],
		});

		service = TestBed.inject(HostedDatabaseService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('should create a hosted database for a company', async () => {
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

		apiService.post.mockResolvedValue(response);

		const result = await service.createHostedDatabase('company-id');

		expect(apiService.post).toHaveBeenCalledWith('/saas/hosted-database/create/company-id', {});
		expect(result).toEqual(response);
	});
});
