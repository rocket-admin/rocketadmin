import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
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
}
