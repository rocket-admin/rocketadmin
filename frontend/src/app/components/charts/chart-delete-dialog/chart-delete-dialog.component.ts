import { CommonModule } from '@angular/common';
import { Component, Inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Angulartics2 } from 'angulartics2';
import posthog from 'posthog-js';
import { SavedQuery } from 'src/app/models/saved-query';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';

@Component({
	selector: 'app-chart-delete-dialog',
	templateUrl: './chart-delete-dialog.component.html',
	styleUrls: ['./chart-delete-dialog.component.css'],
	imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
})
export class ChartDeleteDialogComponent {
	protected submitting = signal(false);

	constructor(
		@Inject(MAT_DIALOG_DATA) public data: { query: SavedQuery; connectionId: string },
		private dialogRef: MatDialogRef<ChartDeleteDialogComponent>,
		private _savedQueries: SavedQueriesService,
		private angulartics2: Angulartics2,
	) {}

	async onDelete(): Promise<void> {
		this.submitting.set(true);
		const result = await this._savedQueries.deleteSavedQuery(this.data.connectionId, this.data.query.id);
		this.submitting.set(false);

		if (result) {
			this.angulartics2.eventTrack.next({
				action: 'Charts: saved query deleted successfully',
			});
			posthog.capture('Charts: saved query deleted successfully');
			this.dialogRef.close(true);
		}
	}
}
