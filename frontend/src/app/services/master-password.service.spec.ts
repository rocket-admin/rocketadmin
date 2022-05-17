import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MasterPasswordDialogComponent } from '../components/master-password-dialog/master-password-dialog.component';

import { MasterPasswordService } from './master-password.service';

describe('MasterPasswordService', () => {
  let service: MasterPasswordService;
  let dialog: MatDialog;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ MatDialogModule ]
    });
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
});
