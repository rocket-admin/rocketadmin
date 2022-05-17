import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ConnectionsService } from 'src/app/services/connections.service';
import { NotificationsService } from 'src/app/services/notifications.service';
import { DbConnectionDeleteDialogComponent } from '../db-connection-delete-dialog/db-connection-delete-dialog.component';

@Component({
  selector: 'app-db-connection-confirm-dialog',
  templateUrl: './db-connection-confirm-dialog.component.html',
  styleUrls: ['./db-connection-confirm-dialog.component.css']
})
export class DbConnectionConfirmDialogComponent implements OnInit {

  public submitting: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _connections: ConnectionsService,
    public dialogRef: MatDialogRef<DbConnectionDeleteDialogComponent>,
    public router: Router,
    private _notifications: NotificationsService
  ) { }

  ngOnInit(): void {}

  editConnection() {
    this._connections.updateConnection(this.data.dbCreds)
      .subscribe(() => {
        this.router.navigate([`/dashboard/${this.data.dbCreds.id}`]);
      }, undefined, () => {
        this.submitting = false;
      })
  }

  createConnection() {
    this._connections.createConnection(this.data.dbCreds)
      .subscribe((res: any) => {
          const connectionID = res.id!;
          this.router.navigate([`/dashboard/${connectionID}`]);
        },
        undefined,
        () => {this.submitting = false}
      )
  }

}
