import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ConnectionsService } from 'src/app/services/connections.service';

@Component({
  selector: 'app-db-connection-delete-dialog',
  templateUrl: './db-connection-delete-dialog.component.html',
  styleUrls: ['./db-connection-delete-dialog.component.css']
})
export class DbConnectionDeleteDialogComponent implements OnInit {

  public connectionName: string;
  public reason: string;
  public message: string;
  public submitting: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _connectionsService: ConnectionsService,
    public dialogRef: MatDialogRef<DbConnectionDeleteDialogComponent>,
    public router: Router
  ) { }

  ngOnInit() {
    this.connectionName = this.data.title || this.data.database;
  }

  deleteConnection() {
    this.submitting = true;
    const metadata = {
      reason: this.reason,
      message: this.message
    }
    this._connectionsService.deleteConnection(this.data.id, metadata)
      .subscribe(() => {
          this.submitting = false;
          this.router.navigate([`/connections-list`]);
          this.dialogRef.close();
        },
        undefined,
        () => { this.submitting = false; }
      );
  }

}
