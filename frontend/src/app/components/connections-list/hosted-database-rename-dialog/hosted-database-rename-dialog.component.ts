import { HttpClient } from '@angular/common/http';
import { Component, Inject, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { CreatedHostedDatabase } from 'src/app/models/hosted-database';
import { ConnectionsService } from 'src/app/services/connections.service';

export interface HostedDatabaseRenameDialogData {
	connectionId: string;
	hostedDatabase: CreatedHostedDatabase;
}

@Component({
	selector: 'app-hosted-database-rename-dialog',
	templateUrl: './hosted-database-rename-dialog.component.html',
	styleUrls: ['./hosted-database-rename-dialog.component.css'],
	imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule],
})
export class HostedDatabaseRenameDialogComponent {
	private _http = inject(HttpClient);
	private _connectionsService = inject(ConnectionsService);

	title = '';
	saving = false;

	constructor(
		@Inject(MAT_DIALOG_DATA) public data: HostedDatabaseRenameDialogData,
		private _dialogRef: MatDialogRef<HostedDatabaseRenameDialogComponent>,
	) {
		this.title = data.hostedDatabase.databaseName || '';
	}

	async save(): Promise<void> {
		const title = this.title.trim();
		if (!title || this.saving) return;

		this.saving = true;
		try {
			const db = this.data.hostedDatabase;
			await firstValueFrom(
				this._http.put(`/connection/${this.data.connectionId}`, {
					title,
					host: db.hostname,
					port: db.port,
					database: db.databaseName,
					username: db.username,
					type: 'postgres',
					ssl: false,
					ssh: false,
					masterEncryption: false,
					azure_encryption: false,
					connectionType: 'direct',
				}),
			);
			this._connectionsService.fetchConnections().subscribe();
			this._dialogRef.close(title);
		} catch {
			this._dialogRef.close();
		} finally {
			this.saving = false;
		}
	}
}
