import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Angulartics2 } from 'angulartics2';
import { TablesService } from 'src/app/services/tables.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-db-table-import-dialog',
  templateUrl: './db-table-import-dialog.component.html',
  styleUrls: ['./db-table-import-dialog.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule
  ]
})
export class DbTableImportDialogComponent {

  public file: File;
  public submitting: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _tables: TablesService,
    public dialogRef: MatDialogRef<DbTableImportDialogComponent>,
    private angulartics2: Angulartics2,
  ) { }

  onFileSelected(event: any) {
    this.file = event.target.files[0];
  }

  importCSV() {
    this.submitting = true;
    this._tables.importTableCSV(this.data.connectionID, this.data.tableName, this.file).subscribe(res => {
      this.dialogRef.close();
      this.submitting = false;
      this.angulartics2.eventTrack.next({
        action: 'Dashboard: db import is successful',
      });
    },
    err => {this.submitting = false; },
    () => { this.submitting = false; }
    );
  }
}
