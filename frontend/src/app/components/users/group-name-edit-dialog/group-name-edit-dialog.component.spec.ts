import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Angulartics2Module } from 'angulartics2';
import { UsersService } from 'src/app/services/users.service';
import { GroupNameEditDialogComponent } from './group-name-edit-dialog.component';

describe('GroupNameEditDialogComponent', () => {
	let component: GroupNameEditDialogComponent;
	let fixture: ComponentFixture<GroupNameEditDialogComponent>;

	const mockDialogRef = {
		close: vi.fn(),
	};

	const mockUsersService: Partial<UsersService> = {
		editGroupName: vi.fn().mockResolvedValue(undefined),
	};

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [
				MatDialogModule,
				MatSnackBarModule,
				FormsModule,
				BrowserAnimationsModule,
				Angulartics2Module.forRoot({}),
				GroupNameEditDialogComponent,
			],
			providers: [
				provideHttpClient(),
				provideRouter([]),
				{
					provide: MAT_DIALOG_DATA,
					useValue: { id: 'test-id', title: 'Test Group' },
				},
				{ provide: MatDialogRef, useValue: mockDialogRef },
				{ provide: UsersService, useValue: mockUsersService },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(GroupNameEditDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
