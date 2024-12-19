import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Angulartics2 } from 'angulartics2';
import { TablesService } from 'src/app/services/tables.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';

@Component({
  selector: 'app-db-table-export-dialog',
  templateUrl: './db-table-export-dialog.component.html',
  styleUrls: ['./db-table-export-dialog.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    MatRadioModule
  ]
})
export class DbTableExportDialogComponent {

  public recordsNumber: Number = 10;
  public recordsExportType: string = 'export-all';
  public submitting: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _tables: TablesService,
    public dialogRef: MatDialogRef<DbTableExportDialogComponent>,
    private angulartics2: Angulartics2,
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
      this.angulartics2.eventTrack.next({
        action: 'Dashboard: db export is successful',
      });
    },
    err => { this.submitting = false; },
    () => { this.submitting = false; });
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
