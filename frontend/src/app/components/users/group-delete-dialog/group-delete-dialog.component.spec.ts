import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Angulartics2Module } from 'angulartics2';
import { UsersService } from 'src/app/services/users.service';
import { GroupDeleteDialogComponent } from './group-delete-dialog.component';

type GroupDeleteTestable = GroupDeleteDialogComponent & {
	submitting: ReturnType<typeof signal<boolean>>;
};

describe('GroupDeleteDialogComponent', () => {
	let component: GroupDeleteDialogComponent;
	let fixture: ComponentFixture<GroupDeleteDialogComponent>;

	const mockDialogRef = {
		close: vi.fn(),
	};

	const mockUsersService: Partial<UsersService> = {
		deleteGroup: vi.fn().mockResolvedValue(undefined),
	};

	beforeEach(async () => {
		TestBed.configureTestingModule({
			imports: [MatSnackBarModule, Angulartics2Module.forRoot(), GroupDeleteDialogComponent],
			providers: [
				provideHttpClient(),
				{ provide: MAT_DIALOG_DATA, useValue: { id: '12345678-123', title: 'Test' } },
				{ provide: MatDialogRef, useValue: mockDialogRef },
				{ provide: UsersService, useValue: mockUsersService },
			],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(GroupDeleteDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should call delete user group service', async () => {
		const testable = component as unknown as GroupDeleteTestable;

		await testable.deleteUsersGroup('12345678-123');

		expect(mockUsersService.deleteGroup).toHaveBeenCalledWith('12345678-123');
		expect(testable.submitting()).toBe(false);
	});
});
