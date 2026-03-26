import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import posthog from 'posthog-js';
import { CreatedHostedDatabase, FoundHostedDatabase } from 'src/app/models/hosted-database';
import { HostedDatabaseService } from 'src/app/services/hosted-database.service';
import { NotificationsService } from 'src/app/services/notifications.service';

@Component({
	selector: 'app-hosted-database-reset-password-dialog',
	templateUrl: './hosted-database-reset-password-dialog.component.html',
	styleUrls: ['./hosted-database-reset-password-dialog.component.css'],
	imports: [MatDialogModule, MatButtonModule, CdkCopyToClipboard],
})
export class HostedDatabaseResetPasswordDialogComponent {
	private _hostedDatabaseService = inject(HostedDatabaseService);
	private _notifications = inject(NotificationsService);

	protected data: FoundHostedDatabase = inject(MAT_DIALOG_DATA);
	protected submitting = signal(false);
	protected result = signal<CreatedHostedDatabase | null>(null);
	protected phase = computed(() => (this.result() ? 'result' : 'confirm'));

	get credentialsText(): string {
		const r = this.result();
		if (!r) return '';
		return `postgres://${r.username}:${r.password}@${r.hostname}:${r.port}/${r.databaseName}`;
	}

	async resetPassword(): Promise<void> {
		this.submitting.set(true);

		try {
			const res = await this._hostedDatabaseService.resetHostedDatabasePassword(this.data.companyId, this.data.id);

			if (res) {
				posthog.capture('Hosted Databases: password reset', { databaseName: this.data.databaseName });
				this.result.set(res);
			}
		} finally {
			this.submitting.set(false);
		}
	}

	handleCredentialsCopied(): void {
		this._notifications.showSuccessSnackbar('New credentials were copied to clipboard.');
	}
}
