import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { Angulartics2Module } from 'angulartics2';
import { UsersService } from 'src/app/services/users.service';
import { UserAddDialogComponent } from './user-add-dialog.component';

describe('UserAddDialogComponent', () => {
	let component: UserAddDialogComponent;
	let fixture: ComponentFixture<UserAddDialogComponent>;

	const mockDialogRef = {
		close: vi.fn(),
	};

	const mockUsersService: Partial<UsersService> = {
		addGroupUser: vi.fn().mockResolvedValue(undefined),
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MatSnackBarModule, FormsModule, Angulartics2Module.forRoot(), UserAddDialogComponent],
			providers: [
				provideHttpClient(),
				provideRouter([]),
				{
					provide: MAT_DIALOG_DATA,
					useValue: {
						availableMembers: [],
						group: {
							id: '12345678-123',
							title: 'Test Group',
						},
					},
				},
				{ provide: MatDialogRef, useValue: mockDialogRef },
				{ provide: UsersService, useValue: mockUsersService },
			],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(UserAddDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should call add user service', async () => {
		const testable = component as unknown as UserAddDialogComponent & {
			groupUserEmail: string;
			joinGroupUser: () => Promise<void>;
		};
		testable.groupUserEmail = 'user@test.com';

		await testable.joinGroupUser();

		expect(mockUsersService.addGroupUser).toHaveBeenCalledWith('12345678-123', 'user@test.com');
	});
});
