import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DbActionConfirmationDialogComponent } from '../db-action-confirmation-dialog/db-action-confirmation-dialog.component';

@Component({
  selector: 'app-db-action-link-dialog',
  templateUrl: './db-action-link-dialog.component.html',
  styleUrls: ['./db-action-link-dialog.component.css']
})
export class DbActionLinkDialogComponent implements OnInit {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<DbActionConfirmationDialogComponent>
  ) { }

  ngOnInit(): void {
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
