import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { UsersService } from 'src/app/services/users.service';
import { UserDeleteDialogComponent } from './user-delete-dialog.component';

type UserDeleteTestable = UserDeleteDialogComponent & {
	submitting: ReturnType<typeof signal<boolean>>;
};

describe('UserDeleteDialogComponent', () => {
	let component: UserDeleteDialogComponent;
	let fixture: ComponentFixture<UserDeleteDialogComponent>;

	const mockDialogRef = {
		close: vi.fn(),
	};

	const mockUsersService: Partial<UsersService> = {
		deleteGroupUser: vi.fn().mockResolvedValue(undefined),
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MatSnackBarModule, UserDeleteDialogComponent],
			providers: [
				provideHttpClient(),
				{ provide: MAT_DIALOG_DATA, useValue: { user: { email: 'user@test.com' }, group: { id: '12345678-123' } } },
				{ provide: MatDialogRef, useValue: mockDialogRef },
				{ provide: UsersService, useValue: mockUsersService },
			],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(UserDeleteDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should call delete user service', async () => {
		const testable = component as unknown as UserDeleteTestable;

		await testable.deleteGroupUser();

		expect(mockUsersService.deleteGroupUser).toHaveBeenCalledWith('user@test.com', '12345678-123');
		expect(testable.submitting()).toBe(false);
	});
});
