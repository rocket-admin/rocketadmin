import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import posthog from 'posthog-js';
import { firstValueFrom } from 'rxjs';
import { FoundHostedDatabase } from 'src/app/models/hosted-database';
import { ConnectionsService } from 'src/app/services/connections.service';
import { NotificationsService } from 'src/app/services/notifications.service';

@Component({
	selector: 'app-hosted-databases-rename-dialog',
	templateUrl: './hosted-database-rename-dialog.component.html',
	styleUrls: ['./hosted-database-rename-dialog.component.css'],
	imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule],
})
export class HostedDatabasesRenameDialogComponent {
	private _connectionsService = inject(ConnectionsService);
	private _notifications = inject(NotificationsService);
	private _dialogRef = inject(MatDialogRef<HostedDatabasesRenameDialogComponent>);

	protected data: FoundHostedDatabase = inject(MAT_DIALOG_DATA);
	protected title = this.data.title || this.data.databaseName || '';
	protected submitting = signal(false);

	async save(): Promise<void> {
		const title = this.title.trim();
		if (!title || this.submitting()) return;

		this.submitting.set(true);

		try {
			const connections = await firstValueFrom(this._connectionsService.fetchConnections());
			const match = connections?.find(
				(item) => item.connection.host === this.data.hostname && item.connection.database === this.data.databaseName,
			);

			if (!match) {
				this._notifications.showErrorSnackbar('Matching connection not found.');
				this.submitting.set(false);
				return;
			}

			await firstValueFrom(this._connectionsService.updateConnectionTitle(match.connection.id, title));
			posthog.capture('Hosted Databases: database renamed', { databaseName: this.data.databaseName });
			this._connectionsService.fetchConnections().subscribe();
			this._dialogRef.close(title);
		} finally {
			this.submitting.set(false);
		}
	}
}
