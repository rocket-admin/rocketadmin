import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { NotificationsService } from 'src/app/services/notifications.service';
import { Connection } from 'src/app/models/connection';
import googlIPsList from 'src/app/consts/google-IP-addresses';
import * as ipaddr from 'ipaddr.js';
import isIP from 'validator/lib/isIP';
import { IpAddressButtonComponent } from '../../ui-components/ip-address-button/ip-address-button.component';

@Component({
  selector: 'app-db-connection-ip-access-dialog',
  templateUrl: './db-connection-ip-access-dialog.component.html',
  styleUrls: ['./db-connection-ip-access-dialog.component.css'],
  standalone: true,
  imports: [
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
    @Inject(MAT_DIALOG_DATA) public db: Connection,
    private _notifications: NotificationsService,

  ) { }

  ngOnInit(): void {
    if (this.db.host.endsWith('.amazonaws.com')) this.provider = 'amazon';
    if (this.db.host.endsWith('.azure.com')) this.provider = 'azure';
    if(isIP(this.db.host)) {
      const hostIP = ipaddr.parse(this.db.host);
      for (const addr of googlIPsList) {
        if (hostIP.match(ipaddr.parseCIDR(addr))) {
          this.provider = 'google';
          return;
        }
      }
    }
  }

  showCopyNotification(message: string) {
    this._notifications.showSuccessSnackbar(message);
  }
}
