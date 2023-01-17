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

  constructor(
    @Inject(MAT_DIALOG_DATA) public rowsKeyAttributes: any,
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private _tableRow: TableRowService,
    public dialogRef: MatDialogRef<DbRowsDeleteDialogComponent>
  ) { }

  ngOnInit(): void {
    this.connectionID = this._connections.currentConnectionID;
    this.selectedTableName = this._tables.currentTableName;

    this._tableRow.cast.subscribe();
    // this._tables.cast.subscribe();
  }

  deleteRow() {
    this.submitting = true;
    // this._tableRow.deleteTableRow(this.connectionID, this.selectedTableName, this.rowKeyAttributes)
    //   .subscribe(() => {
    //     this.dialogRef.close();
    //     this.submitting = false;
    //   },
    //   () => { },
    //   () => { this.submitting = false; }
    // )
  }

}
