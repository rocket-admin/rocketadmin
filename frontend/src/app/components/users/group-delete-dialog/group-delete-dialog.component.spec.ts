import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { UsersService } from 'src/app/services/users.service';
import { GroupDeleteDialogComponent } from './group-delete-dialog.component';

describe('GroupDeleteDialogComponent', () => {
	let component: GroupDeleteDialogComponent;
	let fixture: ComponentFixture<GroupDeleteDialogComponent>;
	let usersService: UsersService;

	const mockDialogRef = {
		close: () => {},
	};

	beforeEach(async () => {
		TestBed.configureTestingModule({
			imports: [MatSnackBarModule, Angulartics2Module.forRoot(), GroupDeleteDialogComponent],
			providers: [
				provideHttpClient(),
				{ provide: MAT_DIALOG_DATA, useValue: {} },
				{ provide: MatDialogRef, useValue: mockDialogRef },
			],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(GroupDeleteDialogComponent);
		component = fixture.componentInstance;
		usersService = TestBed.inject(UsersService);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should call delete user group service', () => {
		const fakeDeleteUsersGroup = vi.spyOn(usersService, 'deleteUsersGroup').mockReturnValue(of());
		vi.spyOn(mockDialogRef, 'close');

		component.deleteUsersGroup('12345678-123');
		expect(fakeDeleteUsersGroup).toHaveBeenCalledWith('12345678-123');
		// expect(component.dialogRef.close).toHaveBeenCalled();
		expect(component.submitting).toBe(false);
	});
});
