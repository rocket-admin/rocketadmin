import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Angulartics2Module } from 'angulartics2';
import { UsersService } from 'src/app/services/users.service';
import { UserAddDialogComponent } from './user-add-dialog.component';

type UserAddTestable = UserAddDialogComponent & {
	submitting: ReturnType<typeof signal<boolean>>;
	groupUserEmail: string;
	joinGroupUser: () => Promise<void>;
};

const fakeMembers = [
	{ id: 'user-1', email: 'alice@test.com', name: 'Alice Smith' },
	{ id: 'user-2', email: 'bob@test.com', name: 'Bob Jones' },
	{ id: 'user-3', email: 'charlie@test.com', name: null },
];

const fakeGroup = {
	id: '12345678-abcd-1234-efgh-123456789012',
	title: 'Developers',
};

describe('UserAddDialogComponent', () => {
	let component: UserAddDialogComponent;
	let fixture: ComponentFixture<UserAddDialogComponent>;
	let mockDialogRef: { close: ReturnType<typeof vi.fn> };
	let mockUsersService: Partial<UsersService>;

	function createComponent(dialogData: { availableMembers: typeof fakeMembers; group: typeof fakeGroup }) {
		mockDialogRef = { close: vi.fn() };
		mockUsersService = {
			addGroupUser: vi.fn().mockResolvedValue(undefined),
		};

		TestBed.configureTestingModule({
			imports: [
				MatSnackBarModule,
				FormsModule,
				BrowserAnimationsModule,
				Angulartics2Module.forRoot(),
				UserAddDialogComponent,
			],
			providers: [
				provideHttpClient(),
				provideRouter([]),
				{ provide: MAT_DIALOG_DATA, useValue: dialogData },
				{ provide: MatDialogRef, useValue: mockDialogRef },
				{ provide: UsersService, useValue: mockUsersService },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(UserAddDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	}

	describe('with available members', () => {
		beforeEach(() => {
			createComponent({ availableMembers: fakeMembers, group: fakeGroup });
		});

		it('should create', () => {
			expect(component).toBeTruthy();
		});

		it('should display group title in dialog header', () => {
			const title = fixture.nativeElement.querySelector('[mat-dialog-title]');
			expect(title.textContent).toContain('Developers');
		});

		it('should render a select dropdown with available members', () => {
			const select = fixture.nativeElement.querySelector('mat-select');
			expect(select).toBeTruthy();
		});

		it('should not show the "all members already in group" message', () => {
			const text = fixture.nativeElement.textContent;
			expect(text).not.toContain('All your company members are already in this group');
		});

		it('should show the "Add users to Company" hint', () => {
			const text = fixture.nativeElement.textContent;
			expect(text).toContain('Add users to the');
			expect(text).toContain('Company');
		});

		it('should render an Add submit button', () => {
			const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
			const addBtn = buttons.find((b) => b.textContent?.trim() === 'Add');
			expect(addBtn).toBeTruthy();
			expect(addBtn!.type).toBe('submit');
		});

		it('should disable Add button when no user is selected (form invalid)', async () => {
			await fixture.whenStable();
			fixture.detectChanges();
			const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
			const addBtn = buttons.find((b) => b.textContent?.trim() === 'Add');
			expect(addBtn!.disabled).toBe(true);
		});

		it('should call addGroupUser with correct groupId and email', async () => {
			const testable = component as unknown as UserAddTestable;
			testable.groupUserEmail = 'alice@test.com';

			await testable.joinGroupUser();

			expect(mockUsersService.addGroupUser).toHaveBeenCalledWith(
				'12345678-abcd-1234-efgh-123456789012',
				'alice@test.com',
			);
		});

		it('should close dialog on successful submission', async () => {
			const testable = component as unknown as UserAddTestable;
			testable.groupUserEmail = 'bob@test.com';

			await testable.joinGroupUser();

			expect(mockDialogRef.close).toHaveBeenCalled();
		});

		it('should reset submitting to false after successful submission', async () => {
			const testable = component as unknown as UserAddTestable;
			testable.groupUserEmail = 'alice@test.com';

			await testable.joinGroupUser();

			expect(testable.submitting()).toBe(false);
		});

		it('should reset submitting to false when service throws', async () => {
			(mockUsersService.addGroupUser as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));
			const testable = component as unknown as UserAddTestable;
			testable.groupUserEmail = 'alice@test.com';

			await testable.joinGroupUser().catch(() => {});

			expect(testable.submitting()).toBe(false);
		});

		it('should not close dialog when service throws', async () => {
			(mockUsersService.addGroupUser as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));
			const testable = component as unknown as UserAddTestable;
			testable.groupUserEmail = 'alice@test.com';

			await testable.joinGroupUser().catch(() => {});

			expect(mockDialogRef.close).not.toHaveBeenCalled();
		});

		it('should not show "Open Company page" link when members are available', () => {
			const links: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('a'));
			const companyPageLink = links.find((a) => a.textContent?.trim() === 'Open Company page');
			expect(companyPageLink).toBeFalsy();
		});
	});

	describe('with no available members', () => {
		beforeEach(() => {
			createComponent({ availableMembers: [], group: fakeGroup });
		});

		it('should create', () => {
			expect(component).toBeTruthy();
		});

		it('should show "all members already in group" message', () => {
			const text = fixture.nativeElement.textContent;
			expect(text).toContain('All your company members are already in this group');
		});

		it('should not render a select dropdown', () => {
			const select = fixture.nativeElement.querySelector('mat-select');
			expect(select).toBeFalsy();
		});

		it('should not render an Add button', () => {
			const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
			const addBtn = buttons.find((b) => b.textContent?.trim() === 'Add');
			expect(addBtn).toBeFalsy();
		});

		it('should show "Open Company page" link', () => {
			const links: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('a'));
			const companyPageLink = links.find((a) => a.textContent?.trim() === 'Open Company page');
			expect(companyPageLink).toBeTruthy();
		});

		it('should link "Open Company page" to /company', () => {
			const links: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('a'));
			const companyPageLink = links.find((a) => a.textContent?.trim() === 'Open Company page');
			expect(companyPageLink?.getAttribute('href')).toBe('/company');
		});
	});
});
