import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { Injectable } from '@angular/core';
import { MasterPasswordDialogComponent } from '../components/master-password-dialog/master-password-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class MasterPasswordService {

  // private showMasterPasswordDialogRef: MatDialogRef<MasterPasswordDialogComponent>;

  constructor(
    public dialog: MatDialog,
  ) { }

  showMasterPasswordDialog() {
    this.dialog.open(MasterPasswordDialogComponent, {
      width: '24em',
      disableClose: true
    })
  }

  checkMasterPassword(isEncryptionEnabled: boolean, connectionID: string, masterKey: string) {
    if (isEncryptionEnabled) {
      localStorage.setItem(`${connectionID}__masterKey`, masterKey);
    } else {
      localStorage.removeItem(`${connectionID}__masterKey`);
    }
  }
}
