import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotificationsService } from 'src/app/services/notifications.service';

@Component({
  selector: 'app-db-connection-ip-access-dialog',
  templateUrl: './db-connection-ip-access-dialog.component.html',
  styleUrls: ['./db-connection-ip-access-dialog.component.css']
})
export class DbConnectionIpAccessDialogComponent implements OnInit {

  constructor(
    @Inject(MAT_DIALOG_DATA) public db: any,
    private _notifications: NotificationsService,

  ) { }

  ngOnInit(): void {
  }

  showCopyNotification(message: string) {
    this._notifications.showSuccessSnackbar(message);
  }

}
