import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { NotificationsService } from 'src/app/services/notifications.service';
import { Connection } from 'src/app/models/connection';
import { IpAddressButtonComponent } from '../../ui-components/ip-address-button/ip-address-button.component';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-db-connection-ip-access-dialog',
  templateUrl: './db-connection-ip-access-dialog.component.html',
  styleUrls: ['./db-connection-ip-access-dialog.component.css'],
  standalone: true,
  imports: [
    NgIf,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    ClipboardModule,
    IpAddressButtonComponent
  ]
})
export class DbConnectionIpAccessDialogComponent implements OnInit {

  public provider: string = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      provider: string,
      db: Connection,
    },
    private _notifications: NotificationsService,

  ) { }

  ngOnInit(): void {

  }

  showCopyNotification(message: string) {
    this._notifications.showSuccessSnackbar(message);
  }
}
