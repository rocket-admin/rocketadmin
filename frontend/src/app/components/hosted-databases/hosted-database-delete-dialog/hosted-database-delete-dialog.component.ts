import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import posthog from 'posthog-js';
import { FoundHostedDatabase } from 'src/app/models/hosted-database';
import { HostedDatabaseService } from 'src/app/services/hosted-database.service';
import { NotificationsService } from 'src/app/services/notifications.service';

@Component({
	selector: 'app-hosted-database-delete-dialog',
	templateUrl: './hosted-database-delete-dialog.component.html',
	styleUrls: ['./hosted-database-delete-dialog.component.css'],
	imports: [MatDialogModule, MatButtonModule],
})
export class HostedDatabaseDeleteDialogComponent {
	private _hostedDatabaseService = inject(HostedDatabaseService);
	private _notifications = inject(NotificationsService);
	private _dialogRef = inject(MatDialogRef<HostedDatabaseDeleteDialogComponent>);

	protected data: FoundHostedDatabase = inject(MAT_DIALOG_DATA);
	protected submitting = signal(false);

	async deleteDatabase(): Promise<void> {
		this.submitting.set(true);

		try {
			const result = await this._hostedDatabaseService.deleteHostedDatabase(this.data.companyId, this.data.id);

			if (result?.success) {
				posthog.capture('Hosted Databases: database deleted', { databaseName: this.data.databaseName });
				this._notifications.showSuccessSnackbar('Hosted database deleted successfully.');
				this._dialogRef.close('delete');
			}
		} finally {
			this.submitting.set(false);
		}
	}
}
