import { ClipboardModule } from '@angular/cdk/clipboard';
import { NgIf } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Connection } from 'src/app/models/connection';
import { NotificationsService } from 'src/app/services/notifications.service';
import { IpAddressButtonComponent } from '../../ui-components/ip-address-button/ip-address-button.component';

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
		IpAddressButtonComponent,
	],
})
export class DbConnectionIpAccessDialogComponent implements OnInit {
	public provider: string = null;
	public providerDocsLink = {
		amazon: 'https://docs.rocketadmin.com/Create%20connections/Direct%20connection/create_aws_mysql',
		azure: 'https://learn.microsoft.com/en-us/azure/mysql/flexible-server/how-to-manage-firewall-portal',
		google: 'https://docs.rocketadmin.com/Create%20connections/Direct%20connection/create_google_cloud',
		mongoatlas: 'https://docs.rocketadmin.com/Create%20connections/Direct%20connection/create_mongo_atlas',
		digitalocean: 'https://docs.rocketadmin.com/Create%20connections/Direct%20connection/create_digitalocean_postgresql',
		supabase: 'https://docs.rocketadmin.com/Create%20connections/Direct%20connection/create_supabase',
	};

	constructor(
		@Inject(MAT_DIALOG_DATA)
		public data: {
			provider: string;
			db: Connection;
		},
		private _notifications: NotificationsService,
	) {}

	ngOnInit(): void {}

	showCopyNotification(message: string) {
		this._notifications.showSuccessSnackbar(message);
	}
}
