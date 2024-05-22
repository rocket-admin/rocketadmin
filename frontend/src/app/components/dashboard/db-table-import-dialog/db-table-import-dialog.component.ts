import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TablesService } from 'src/app/services/tables.service';

@Component({
  selector: 'app-db-table-import-dialog',
  templateUrl: './db-table-import-dialog.component.html',
  styleUrls: ['./db-table-import-dialog.component.css']
})
export class DbTableImportDialogComponent {

  public file: File;
  public submitting: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _tables: TablesService,
    public dialogRef: MatDialogRef<DbTableImportDialogComponent>,
  ) { }

  onFileSelected(event: any) {
    this.file = event.target.files[0];
  }

  importCSV() {
    this.submitting = true;
    this._tables.importTableCSV(this.data.connectionID, this.data.tableName, this.file).subscribe(res => {
      this.dialogRef.close();
      this.submitting = false;
    },
    err => { this.submitting = false; },
    () => { this.submitting = false; }
    );
  }
}
