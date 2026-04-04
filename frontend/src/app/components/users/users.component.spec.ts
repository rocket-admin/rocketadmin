import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { Angulartics2Module } from 'angulartics2';
import { CedarPermissionService } from 'src/app/services/cedar-permission.service';
import { UsersService } from 'src/app/services/users.service';
import { GroupAddDialogComponent } from './group-add-dialog/group-add-dialog.component';
import { GroupDeleteDialogComponent } from './group-delete-dialog/group-delete-dialog.component';
import { UserAddDialogComponent } from './user-add-dialog/user-add-dialog.component';
import { UserDeleteDialogComponent } from './user-delete-dialog/user-delete-dialog.component';
import { UsersComponent } from './users.component';

describe('UsersComponent', () => {
	let component: UsersComponent;
	let fixture: ComponentFixture<UsersComponent>;
	let dialog: MatDialog;

	const fakeGroup = {
		id: 'a9a97cf1-cb2f-454b-a74e-0075dd07ad92',
		title: 'Admin',
		isMain: true,
	};

	const mockGroups = signal([
		{
			group: {
				id: 'a9a97cf1-cb2f-454b-a74e-0075dd07ad92',
				title: 'Admin',
				isMain: true,
			},
			accessLevel: 'edit',
		},
		{
			group: {
				id: '77154868-eaf0-4a53-9693-0470182d0971',
				title: 'Sellers',
				isMain: false,
			},
			accessLevel: 'edit',
		},
	]);

	const mockUsersService: Partial<UsersService> = {
		groups: mockGroups.asReadonly() as any,
		groupsLoading: signal(false).asReadonly() as any,
		groupUsers: signal({}).asReadonly() as any,
		groupsUpdated: signal('').asReadonly() as any,
		setActiveConnection: vi.fn(),
		refreshGroups: vi.fn(),
		clearGroupsUpdated: vi.fn(),
		fetchGroupUsers: vi.fn().mockResolvedValue([]),
		fetchAllGroupUsers: vi.fn().mockResolvedValue(undefined),
		fetchConnectionUsers: vi.fn(),
	};

	const mockPermissions: Partial<CedarPermissionService> = {
		canI: () => signal(true).asReadonly(),
		ready: signal(true).asReadonly(),
	};

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [MatSnackBarModule, MatDialogModule, Angulartics2Module.forRoot(), UsersComponent],
			providers: [
				provideHttpClient(),
				provideRouter([]),
				{ provide: MatDialogRef, useValue: {} },
				{ provide: UsersService, useValue: mockUsersService },
				{ provide: CedarPermissionService, useValue: mockPermissions },
			],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(UsersComponent);
		component = fixture.componentInstance;
		dialog = TestBed.inject(MatDialog);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should open create group dialog', () => {
		const fakeCreateUsersGroupOpen = vi.spyOn(dialog, 'open');
		const event = { preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() } as unknown as Event;

		component.openCreateUsersGroupDialog(event);
		expect(fakeCreateUsersGroupOpen).toHaveBeenCalledWith(GroupAddDialogComponent, {
			width: '25em',
		});
	});

	it('should open add user dialog', () => {
		const fakeAddUserDialogOpen = vi.spyOn(dialog, 'open');

		component.openAddUserDialog(fakeGroup);
		expect(fakeAddUserDialogOpen).toHaveBeenCalledWith(UserAddDialogComponent, {
			width: '25em',
			data: { group: fakeGroup, availableMembers: [] },
		});
	});

	it('should open delete group dialog', () => {
		const fakeDeleteGroupDialogOpen = vi.spyOn(dialog, 'open');

		component.openDeleteGroupDialog(fakeGroup);
		expect(fakeDeleteGroupDialogOpen).toHaveBeenCalledWith(GroupDeleteDialogComponent, {
			width: '25em',
			data: fakeGroup,
		});
	});

	it('should open delete user dialog', () => {
		const fakeUser = {
			id: 'user-12345678',
			createdAt: '2021-10-01T13:43:02.034Z',
			gclid: null,
			isActive: true,
			stripeId: 'cus_123456789',
			email: 'user@test.com',
		};

		const fakeDeleteUserDialogOpen = vi.spyOn(dialog, 'open');

		component.openDeleteUserDialog(fakeUser, fakeGroup);
		expect(fakeDeleteUserDialogOpen).toHaveBeenCalledWith(UserDeleteDialogComponent, {
			width: '25em',
			data: { user: fakeUser, group: fakeGroup },
		});
	});

	it('should return null for group users that are not loaded', () => {
		const result = component.getGroupUsers('nonexistent-id');
		expect(result).toBeNull();
	});
});
