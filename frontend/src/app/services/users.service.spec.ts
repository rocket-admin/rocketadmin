import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { AccessLevel } from '../models/user';
import { ApiService } from './api.service';
import { NotificationsService } from './notifications.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
	let service: UsersService;
	let httpMock: HttpTestingController;
	let fakeNotifications: { showErrorSnackbar: ReturnType<typeof vi.fn>; showSuccessSnackbar: ReturnType<typeof vi.fn> };
	let mockApi: {
		resource: ReturnType<typeof vi.fn>;
		get: ReturnType<typeof vi.fn>;
		post: ReturnType<typeof vi.fn>;
		put: ReturnType<typeof vi.fn>;
		delete: ReturnType<typeof vi.fn>;
	};

	const groupNetwork = {
		title: 'Managers',
		users: [
			{
				id: '83f35e11-6499-470e-9ccb-08b6d9393943',
				createdAt: '2021-07-21T14:35:17.270Z',
				gclid: null,
				isActive: true,
			},
		],
		id: '1c042912-326d-4fc5-bb0c-10da88dd37c4',
		isMain: false,
	};

	const permissionsNetwork = {
		connection: {
			connectionId: '75b0574a-9fc5-4472-90e1-5c030b0b28b5',
			accessLevel: 'readonly',
		},
		group: {
			groupId: '1c042912-326d-4fc5-bb0c-10da88dd37c4',
			accessLevel: 'edit',
		},
		tables: [
			{
				tableName: 'TOYS_TEST',
				accessLevel: {
					visibility: true,
					readonly: true,
					add: false,
					delete: false,
					edit: false,
				},
			},
			{
				tableName: 'PRODUCTS_TEST',
				accessLevel: {
					visibility: true,
					readonly: false,
					add: true,
					delete: false,
					edit: true,
				},
			},
		],
	};

	const permissionsApp = {
		connection: {
			accessLevel: AccessLevel.Readonly,
			connectionId: '75b0574a-9fc5-4472-90e1-5c030b0b28b5',
		},
		group: {
			accessLevel: AccessLevel.Edit,
			groupId: '1c042912-326d-4fc5-bb0c-10da88dd37c4',
		},
		tables: [
			{
				accessLevel: {
					add: false,
					delete: false,
					edit: false,
					readonly: true,
					visibility: true,
				},
				tableName: 'TOYS_TEST',
				display_name: 'Toys tests',
			},
			{
				accessLevel: {
					add: true,
					delete: false,
					edit: true,
					readonly: false,
					visibility: true,
				},
				tableName: 'PRODUCTS_TEST',
				display_name: 'Product tests',
			},
		],
	};

	const fakeError = {
		message: 'Connection error',
		statusCode: 400,
		type: 'no_master_key',
	};

	beforeEach(() => {
		fakeNotifications = {
			showErrorSnackbar: vi.fn(),
			showSuccessSnackbar: vi.fn(),
		};

		mockApi = {
			resource: vi.fn().mockReturnValue({
				value: () => undefined,
				isLoading: () => false,
				error: () => null,
				reload: vi.fn(),
			}),
			get: vi.fn(),
			post: vi.fn(),
			put: vi.fn(),
			delete: vi.fn(),
		};

		TestBed.configureTestingModule({
			imports: [MatSnackBarModule],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([]),
				{ provide: NotificationsService, useValue: fakeNotifications },
				{ provide: ApiService, useValue: mockApi },
			],
		});

		service = TestBed.inject(UsersService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	// Signal-based service tests

	it('should set active connection', () => {
		service.setActiveConnection('conn-123');
		expect(mockApi.resource).toHaveBeenCalled();
	});

	it('should create group via ApiService', async () => {
		mockApi.post.mockResolvedValue(groupNetwork);

		const result = await service.createGroup('12345678', 'Managers');

		expect(mockApi.post).toHaveBeenCalledWith(
			'/connection/group/12345678',
			{ title: 'Managers' },
			{ successMessage: 'Group of users has been created.' },
		);
		expect(result).toEqual(groupNetwork);
		expect(service.groupsUpdated()).toBe('group-added');
	});

	it('should delete group via ApiService', async () => {
		mockApi.delete.mockResolvedValue({});

		await service.deleteGroup('group12345678');

		expect(mockApi.delete).toHaveBeenCalledWith('/group/group12345678', { successMessage: 'Group has been removed.' });
		expect(service.groupsUpdated()).toBe('group-deleted');
	});

	it('should edit group name via ApiService', async () => {
		mockApi.put.mockResolvedValue({});

		await service.editGroupName('group-id', 'New Title');

		expect(mockApi.put).toHaveBeenCalledWith(
			'/group/title',
			{ title: 'New Title', groupId: 'group-id' },
			{ successMessage: 'Group name has been updated.' },
		);
		expect(service.groupsUpdated()).toBe('group-renamed');
	});

	it('should save cedar policy via ApiService', async () => {
		mockApi.post.mockResolvedValue({});

		await service.saveCedarPolicy('conn-123', 'group-123', 'permit(...)');

		expect(mockApi.post).toHaveBeenCalledWith(
			'/connection/cedar-policy/conn-123',
			{ cedarPolicy: 'permit(...)', groupId: 'group-123' },
			{ successMessage: 'Policy has been saved.' },
		);
		expect(service.groupsUpdated()).toBe('policy-saved');
	});

	it('should add group user via ApiService', async () => {
		mockApi.put.mockResolvedValue({});

		await service.addGroupUser('group12345678', 'eric.cartman@south.park');

		expect(mockApi.put).toHaveBeenCalledWith(
			'/group/user',
			{ email: 'eric.cartman@south.park', groupId: 'group12345678' },
			{ successMessage: 'User has been added to group.' },
		);
		expect(service.groupsUpdated()).toBe('user-added');
	});

	it('should delete group user via ApiService', async () => {
		mockApi.put.mockResolvedValue({});

		await service.deleteGroupUser('eric.cartman@south.park', 'group12345678');

		expect(mockApi.put).toHaveBeenCalledWith(
			'/group/user/delete',
			{ email: 'eric.cartman@south.park', groupId: 'group12345678' },
			{ successMessage: 'User has been removed from group.' },
		);
		expect(service.groupsUpdated()).toBe('user-deleted');
	});

	it('should fetch group users and update signal', async () => {
		const mockUsers = [{ id: 'user-1', createdAt: '', gclid: null, isActive: true, stripeId: '', email: 'a@b.com' }];
		mockApi.get.mockResolvedValue(mockUsers);

		const result = await service.fetchGroupUsers('group-123');

		expect(mockApi.get).toHaveBeenCalledWith('/group/users/group-123');
		expect(result).toEqual(mockUsers);
		expect(service.groupUsers()['group-123']).toEqual(mockUsers);
	});

	it('should set group users to empty when no users returned', async () => {
		mockApi.get.mockResolvedValue([]);

		await service.fetchGroupUsers('group-123');

		expect(service.groupUsers()['group-123']).toBe('empty');
	});

	it('should clear groups updated signal', () => {
		service.clearGroupsUpdated();
		expect(service.groupsUpdated()).toBe('');
	});

	// Legacy Observable method tests

	it('should call fetchConnectionUsers', () => {
		let isSubscribeCalled = false;
		const usersNetwork = [
			{
				id: '83f35e11-6499-470e-9ccb-08b6d9393943',
				isActive: true,
				email: 'lyubov+fghj@voloshko.com',
				createdAt: '2021-07-21T14:35:17.270Z',
			},
		];

		service.fetchConnectionUsers('12345678').subscribe((res) => {
			expect(res).toEqual(usersNetwork);
			isSubscribeCalled = true;
		});

		const req = httpMock.expectOne(`/connection/users/12345678`);
		expect(req.request.method).toBe('GET');
		req.flush(usersNetwork);

		expect(isSubscribeCalled).toBe(true);
	});

	it('should fail fetchConnectionUsers and show Error snackbar', async () => {
		const fetchConnectionUsers = service.fetchConnectionUsers('12345678').toPromise();

		const req = httpMock.expectOne(`/connection/users/12345678`);
		expect(req.request.method).toBe('GET');
		req.flush(fakeError, { status: 400, statusText: '' });
		await fetchConnectionUsers;

		expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
	});

	it('should call fetchPermission', () => {
		let isSubscribeCalled = false;

		service.fetchPermission('12345678', 'group12345678').subscribe((res) => {
			expect(res).toEqual(permissionsNetwork);
			isSubscribeCalled = true;
		});

		const req = httpMock.expectOne(`/connection/permissions?connectionId=12345678&groupId=group12345678`);
		expect(req.request.method).toBe('GET');
		req.flush(permissionsNetwork);

		expect(isSubscribeCalled).toBe(true);
	});

	it('should fail fetchPermission and show Error snackbar', async () => {
		const fetchPermission = service.fetchPermission('12345678', 'group12345678').toPromise();

		const req = httpMock.expectOne(`/connection/permissions?connectionId=12345678&groupId=group12345678`);
		expect(req.request.method).toBe('GET');
		req.flush(fakeError, { status: 400, statusText: '' });
		await fetchPermission;

		expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
	});

	it('should call updatePermission and show Success snackbar', () => {
		let isSubscribeCalled = false;

		service.updatePermission('12345678', permissionsApp).subscribe((_res) => {
			expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledWith('Permissions have been updated successfully.');
			isSubscribeCalled = true;
		});

		const req = httpMock.expectOne(`/permissions/1c042912-326d-4fc5-bb0c-10da88dd37c4?connectionId=12345678`);
		expect(req.request.method).toBe('PUT');
		expect(req.request.body).toEqual({ permissions: permissionsApp });
		req.flush(permissionsNetwork);

		expect(isSubscribeCalled).toBe(true);
	});

	it('should fail updatePermission and show Error snackbar', async () => {
		const updatePermission = service.updatePermission('12345678', permissionsApp).toPromise();

		const req = httpMock.expectOne(`/permissions/1c042912-326d-4fc5-bb0c-10da88dd37c4?connectionId=12345678`);
		expect(req.request.method).toBe('PUT');
		req.flush(fakeError, { status: 400, statusText: '' });
		await updatePermission;

		expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
	});
});
