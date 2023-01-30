import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TablesService } from 'src/app/services/tables.service';
import { TableRowService } from 'src/app/services/table-row.service';
import { ConnectionsService } from 'src/app/services/connections.service';

@Component({
  selector: 'app-db-action-confirmation-dialog',
  templateUrl: './db-action-confirmation-dialog.component.html',
  styleUrls: ['./db-action-confirmation-dialog.component.css']
})
export class DbActionConfirmationDialogComponent implements OnInit {

  public selectedTableName;
  public submitting: boolean = false;
  public connectionID: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private _tableRow: TableRowService,
    public dialogRef: MatDialogRef<DbActionConfirmationDialogComponent>
  ) { }

  ngOnInit(): void {
    this.connectionID = this._connections.currentConnectionID;
    this.selectedTableName = this._tables.currentTableName;

    this._tableRow.cast.subscribe();
    // this._tables.cast.subscribe();
  }

  onActionComplete() {
    this.dialogRef.close();
    this.submitting = false;
  }

  handleConfirmedAction() {
    this.submitting = true;

    if (this.data.id) {
      this._tables.activateAction(this.connectionID, this.selectedTableName, this.data.id, this.data.title, this.data.primaryKeys)
        .subscribe(
          () => { this.onActionComplete() },
          () => { this.onActionComplete() },
          () => { this.onActionComplete() }
        );
    } else {
      this._tableRow.deleteTableRow(this.connectionID, this.selectedTableName, this.data.primaryKeys)
        .subscribe(
          () => { this.onActionComplete() },
          () => { this.onActionComplete() },
          () => { this.onActionComplete() }
        )
    }
  }
}
