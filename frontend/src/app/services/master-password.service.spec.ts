import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MasterPasswordDialogComponent } from '../components/master-password-dialog/master-password-dialog.component';

import { MasterPasswordService } from './master-password.service';

describe('MasterPasswordService', () => {
  let service: MasterPasswordService;
  let dialog: MatDialog;
  let mockLocalStorage;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ MatDialogModule ]
    });

    let store = {};
    mockLocalStorage = {
      getItem: (key: string): string => {
        return key in store ? store[key] : null;
      },
      setItem: (key: string, value: string) => {
        store[key] = `${value}`;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      }
    };

    service = TestBed.get(MasterPasswordService);
    dialog = TestBed.get(MatDialog);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should show Master password dialog', () => {
    const fakeDialog = spyOn(dialog, 'open');
    service.showMasterPasswordDialog();
    // !!!!!!! MasterPasswordDialogComponent should be mocked !!!!!!!!!!
    expect(fakeDialog).toHaveBeenCalledOnceWith(MasterPasswordDialogComponent, {
      width: '24em',
      disableClose: true
    });
  });

  it('should write master key in localstorage if masterEncryption is turned on', () => {
    spyOn(localStorage, 'setItem').and.callFake(mockLocalStorage.setItem);

    service.checkMasterPassword(true, '12345678', 'abcd-0987654321');

    expect(localStorage.setItem).toHaveBeenCalledOnceWith('12345678__masterKey', 'abcd-0987654321');
  })

  it('should remove master key in localstorage if masterEncryption is turned off', () => {
    spyOn(localStorage, 'removeItem').and.callFake(mockLocalStorage.removeItem);

    service.checkMasterPassword(false, '12345678', 'abcd-0987654321');

    expect(localStorage.removeItem).toHaveBeenCalledOnceWith('12345678__masterKey');
  })
});
