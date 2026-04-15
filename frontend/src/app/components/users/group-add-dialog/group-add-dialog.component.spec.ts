import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Angulartics2Module } from 'angulartics2';
import { UsersService } from 'src/app/services/users.service';
import { GroupAddDialogComponent } from './group-add-dialog.component';

type GroupAddTestable = GroupAddDialogComponent & {
	submitting: ReturnType<typeof signal<boolean>>;
	connectionID: string;
	groupTitle: string;
	addGroup: () => Promise<void>;
};

describe('GroupAddDialogComponent', () => {
	let component: GroupAddDialogComponent;
	let fixture: ComponentFixture<GroupAddDialogComponent>;

	const mockDialogRef = {
		close: vi.fn(),
	};

	const mockUsersService: Partial<UsersService> = {
		createGroup: vi.fn().mockResolvedValue({ id: 'new-group', title: 'Sellers' }),
	};

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [
				MatSnackBarModule,
				FormsModule,
				MatDialogModule,
				Angulartics2Module.forRoot({}),
				GroupAddDialogComponent,
				BrowserAnimationsModule,
			],
			providers: [
				provideHttpClient(),
				provideRouter([]),
				{ provide: MAT_DIALOG_DATA, useValue: {} },
				{ provide: MatDialogRef, useValue: mockDialogRef },
				{ provide: UsersService, useValue: mockUsersService },
			],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(GroupAddDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should call create group service', async () => {
		const testable = component as unknown as GroupAddTestable;
		testable.connectionID = '12345678';
		testable.groupTitle = 'Sellers';

		await testable.addGroup();

		expect(mockUsersService.createGroup).toHaveBeenCalledWith('12345678', 'Sellers');
		expect(testable.submitting()).toBe(false);
	});
});
