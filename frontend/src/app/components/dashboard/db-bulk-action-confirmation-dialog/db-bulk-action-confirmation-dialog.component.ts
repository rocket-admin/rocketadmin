import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TablesService } from 'src/app/services/tables.service';
import { TableRowService } from 'src/app/services/table-row.service';
import { ConnectionsService } from 'src/app/services/connections.service';

@Component({
  selector: 'app-db-rows-delete-dialog',
  templateUrl: './db-bulk-action-confirmation-dialog.component.html',
  styleUrls: ['./db-bulk-action-confirmation-dialog.component.css']
})
export class BbBulkActionConfirmationDialogComponent implements OnInit {

  public selectedTableName;
  public submitting: boolean = false;
  public connectionID: string;
  // public selectedRows: object[];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _connections: ConnectionsService,
    private _tables: TablesService,
    public dialogRef: MatDialogRef<BbBulkActionConfirmationDialogComponent>
  ) { }

  ngOnInit(): void {
    this.connectionID = this._connections.currentConnectionID;
    this.selectedTableName = this._tables.currentTableName;

    // this._tableRow.cast.subscribe();
    this._tables.cast.subscribe();

  }

  onActionsComplete() {
    this.dialogRef.close();
    this.submitting = false;
  }

  handleConfirmedActions() {
    this.submitting = true;

    if (this.data.id) {
      this._tables.activateActions(this.connectionID, this.selectedTableName, this.data.id, this.data.title, this.data.primaryKeys, true)
        .subscribe(
          () => { this.onActionsComplete() },
          () => { this.onActionsComplete() },
          () => { this.onActionsComplete() }
        )
    } else {
      this._tables.bulkDelete(this.connectionID, this.selectedTableName, this.data.primaryKeys)
        .subscribe(
          () => { this.onActionsComplete() },
          () => { this.onActionsComplete() },
          () => { this.onActionsComplete() }
      )
    }
  }
}
