import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import posthog from 'posthog-js';
import { CreatedHostedDatabase } from 'src/app/models/hosted-database';
import { NotificationsService } from 'src/app/services/notifications.service';

export interface HostedDatabaseSuccessDialogData {
	hostedDatabase: CreatedHostedDatabase;
	connectionId: string | null;
	errorMessage?: string;
}

@Component({
	selector: 'app-hosted-database-success-dialog',
	templateUrl: './hosted-database-success-dialog.component.html',
	styleUrl: './hosted-database-success-dialog.component.css',
	imports: [MatDialogModule, MatButtonModule, RouterModule, CdkCopyToClipboard],
})
export class HostedDatabaseSuccessDialogComponent {
	constructor(
		@Inject(MAT_DIALOG_DATA) public data: HostedDatabaseSuccessDialogData,
		private _notifications: NotificationsService,
	) {}

	get credentialsText(): string {
		const { username, password, hostname, port, databaseName } = this.data.hostedDatabase;
		return `postgres://${username}:${password}@${hostname}:${port}/${databaseName}`;
	}

	handleCredentialsCopied(): void {
		posthog.capture('Connections: hosted PostgreSQL credentials copied');
		this._notifications.showSuccessSnackbar('Hosted database credentials were copied to clipboard.');
	}

	handlePrimaryActionClick(): void {
		posthog.capture('Connections: hosted PostgreSQL setup dashboard opened');
	}

	handleSecondaryActionClick(): void {
		posthog.capture('Connections: hosted PostgreSQL tables opened');
	}
}
