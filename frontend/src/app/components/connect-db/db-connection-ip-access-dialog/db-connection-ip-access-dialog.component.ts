import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotificationsService } from 'src/app/services/notifications.service';
import { Connection } from 'src/app/models/connection';

@Component({
  selector: 'app-db-connection-ip-access-dialog',
  templateUrl: './db-connection-ip-access-dialog.component.html',
  styleUrls: ['./db-connection-ip-access-dialog.component.css']
})
export class DbConnectionIpAccessDialogComponent implements OnInit {

  public provider: string = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public db: Connection,
    private _notifications: NotificationsService,

  ) { }

  ngOnInit(): void {
    if (this.db.host.endsWith('.amazonaws.com')) this.provider = 'amazon';
    if (this.db.host.endsWith('.azure.com')) this.provider = 'azure';
  }

  showCopyNotification(message: string) {
    this._notifications.showSuccessSnackbar(message);
  }
}
