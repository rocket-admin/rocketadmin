import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { MasterPasswordDialogComponent } from '../components/master-password-dialog/master-password-dialog.component';

import { MasterPasswordService } from './master-password.service';

describe('MasterPasswordService', () => {
	let service: MasterPasswordService;
	let dialog: MatDialog;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [MatDialogModule],
			providers: [provideHttpClient(), provideRouter([]), { provide: MatDialogRef, useValue: { close: vi.fn() } }],
		});

		service = TestBed.inject(MasterPasswordService);
		dialog = TestBed.inject(MatDialog);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('should show Master password dialog', () => {
		const fakeDialog = vi
			.spyOn(dialog, 'open')
			.mockReturnValue({ afterClosed: () => ({ subscribe: () => {} }) } as any);
		service.showMasterPasswordDialog();
		expect(fakeDialog).toHaveBeenCalledWith(MasterPasswordDialogComponent, {
			width: '24em',
			disableClose: true,
		});
	});

	it('should write master key in localstorage if masterEncryption is turned on', () => {
		const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

		service.checkMasterPassword(true, '12345678', 'abcd-0987654321');

		expect(setItemSpy).toHaveBeenCalledWith('12345678__masterKey', 'abcd-0987654321');
	});

	it('should remove master key in localstorage if masterEncryption is turned off', () => {
		const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

		service.checkMasterPassword(false, '12345678', 'abcd-0987654321');

		expect(removeItemSpy).toHaveBeenCalledWith('12345678__masterKey');
	});
});
