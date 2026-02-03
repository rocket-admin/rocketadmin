import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Angulartics2Module } from 'angulartics2';
import { AccountDeleteConfirmationComponent } from '../account-delete-confirmation/account-delete-confirmation.component';
import { AccountDeleteDialogComponent } from './account-delete-dialog.component';

describe('AccountDeleteDialogComponent', () => {
	let component: AccountDeleteDialogComponent;
	let fixture: ComponentFixture<AccountDeleteDialogComponent>;
	let mockMatDialog: { open: ReturnType<typeof vi.fn> };

	const mockDialogRef = {
		close: () => {},
	};

	beforeEach(async () => {
		mockMatDialog = { open: vi.fn() };

		await TestBed.configureTestingModule({
			imports: [
				MatSnackBarModule,
				FormsModule,
				MatRadioModule,
				BrowserAnimationsModule,
				Angulartics2Module.forRoot(),
				AccountDeleteDialogComponent,
			],
			providers: [
				provideHttpClient(),
				{ provide: MAT_DIALOG_DATA, useValue: {} },
				{ provide: MatDialogRef, useValue: mockDialogRef },
			],
		})
			.overrideComponent(AccountDeleteDialogComponent, {
				set: {
					providers: [{ provide: MatDialog, useFactory: () => mockMatDialog }],
				},
			})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(AccountDeleteDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should open dialog for delete account confirmation', () => {
		component.reason = 'technical-issues';
		component.message = 'I cannot add connection';

		component.openDeleteConfirmation();

		expect(mockMatDialog.open).toHaveBeenCalledWith(AccountDeleteConfirmationComponent, {
			width: '20em',
			data: {
				reason: 'technical-issues',
				message: 'I cannot add connection',
			},
		});
	});
});
