import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TablesService } from 'src/app/services/tables.service';
import { TableRowService } from 'src/app/services/table-row.service';
import { ConnectionsService } from 'src/app/services/connections.service';

@Component({
  selector: 'app-db-rows-delete-dialog',
  templateUrl: './db-rows-delete-dialog.component.html',
  styleUrls: ['./db-rows-delete-dialog.component.css']
})
export class DbRowsDeleteDialogComponent implements OnInit {

  public selectedTableName;
  public submitting: boolean = false;
  public connectionID: string;
  public selectedRows: [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _connections: ConnectionsService,
    private _tables: TablesService,
    public dialogRef: MatDialogRef<DbRowsDeleteDialogComponent>
  ) { }

  ngOnInit(): void {
    this.connectionID = this._connections.currentConnectionID;
    this.selectedTableName = this._tables.currentTableName;

    // this._tableRow.cast.subscribe();
    this._tables.cast.subscribe();

    this.selectedRows = this.data.selectedRows.map(row => this.getPrimaryKey(row))
  }

  getPrimaryKey(row) {
    return Object.assign({}, ...this.data.primaryKeys.map((primaryKey) => ({[primaryKey.column_name]: row[primaryKey.column_name]})));
  }

  deleteRow() {
    this.submitting = true;
    this._tables.bulkDelete(this.connectionID, this.selectedTableName, this.selectedRows)
      .subscribe(() => {
        this.dialogRef.close();
        this.submitting = false;
      },
      () => { },
      () => { this.submitting = false; }
    )
  }

}
