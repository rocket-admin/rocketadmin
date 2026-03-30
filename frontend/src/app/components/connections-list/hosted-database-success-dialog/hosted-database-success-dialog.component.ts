import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { HttpClient } from '@angular/common/http';
import { Component, Inject, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
	imports: [MatDialogModule, MatButtonModule, MatIconModule, RouterModule, CdkCopyToClipboard, FormsModule],
})
export class HostedDatabaseSuccessDialogComponent {
	private _http = inject(HttpClient);
	public connectionTitle = '';
	private _titleSaved = false;

	constructor(
		@Inject(MAT_DIALOG_DATA) public data: HostedDatabaseSuccessDialogData,
		private _notifications: NotificationsService,
	) {
		this.connectionTitle = data.hostedDatabase.databaseName || '';
	}

	saveTitle(): void {
		const title = this.connectionTitle.trim();
		if (!title || !this.data.connectionId) return;
		if (this._titleSaved && title === this._lastSavedTitle) return;

		this._http.put(`/connection/${this.data.connectionId}`, { title }).subscribe({
			next: () => {
				this._titleSaved = true;
				this._lastSavedTitle = title;
			},
			error: () => {},
		});
	}

	private _lastSavedTitle = '';

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
