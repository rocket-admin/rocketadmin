import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TablesService } from 'src/app/services/tables.service';
import { GroupAddDialogComponent } from '../../users/group-add-dialog/group-add-dialog.component';

@Component({
  selector: 'app-db-table-export-dialog',
  templateUrl: './db-table-export-dialog.component.html',
  styleUrls: ['./db-table-export-dialog.component.css']
})
export class DbTableExportDialogComponent {

  public recordsNumber: Number = 10;
  public recordsExportType: string = 'export-all';
  public submitting: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _tables: TablesService,
    public dialogRef: MatDialogRef<GroupAddDialogComponent>,
  ) { }

  exportCSV() {
    this.submitting = true;
    if (this.recordsExportType === 'export-all') {
      this.data = { ...this.data, chunkSize: 100000 };
    };

    if (this.recordsExportType === 'export-records-number') {
      this.data = { ...this.data, chunkSize: this.recordsNumber };
    }

    this._tables.exportTableCSV(this.data).subscribe(res => {
      this.downloadCSV(res);
      this.submitting = false;
      this.dialogRef.close();
    });
  }

  downloadCSV(data) {
    const blob = new Blob([data], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'database.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

}
