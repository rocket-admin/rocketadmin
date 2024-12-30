import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { TablesService } from 'src/app/services/tables.service';
import { TableRowService } from 'src/app/services/table-row.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DbActionLinkDialogComponent } from '../db-action-link-dialog/db-action-link-dialog.component';

@Component({
  selector: 'app-db-rows-delete-dialog',
  templateUrl: './db-bulk-action-confirmation-dialog.component.html',
  styleUrls: ['./db-bulk-action-confirmation-dialog.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule
  ]
})
export class BbBulkActionConfirmationDialogComponent implements OnInit {

  public selectedTableName;
  public submitting: boolean = false;
  public connectionID: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private _tableRow: TableRowService,
    public dialog: MatDialog,
    public dialogRef: MatDialogRef<BbBulkActionConfirmationDialogComponent>,
  ) { }

  ngOnInit(): void {
    this.connectionID = this._connections.currentConnectionID;
    this.selectedTableName = this._tables.currentTableName;
    console.log(this.data);
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
          (res) => {
            this.onActionsComplete();
            if (res && res.location) this.dialog.open(DbActionLinkDialogComponent, {
              width: '25em',
              data: {href: res.location, actionName: this.data.title, primaryKeys: this.data.primaryKeys[0]}
            })
           },
          () => { this.onActionsComplete() },
          () => { this.onActionsComplete() }
        )
    } else {
      if (this.data.primaryKeys.length === 1) {
        this._tableRow.deleteTableRow(this.connectionID, this.selectedTableName, this.data.primaryKeys[0])
          .subscribe(
            () => { this.onActionsComplete() },
            () => { this.onActionsComplete() },
            () => { this.onActionsComplete() }
          )
      } else if (this.data.primaryKeys.length > 1) {
        this._tables.bulkDelete(this.connectionID, this.selectedTableName, this.data.primaryKeys)
        .subscribe(
          () => { this.onActionsComplete() },
          () => { this.onActionsComplete() },
          () => { this.onActionsComplete() }
      )
      }
    }
  }
}
