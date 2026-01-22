import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Angulartics2 } from 'angulartics2';
import { SavedQuery } from 'src/app/models/saved-query';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';

@Component({
	selector: 'app-chart-delete-dialog',
	templateUrl: './chart-delete-dialog.component.html',
	styleUrls: ['./chart-delete-dialog.component.css'],
	imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
})
export class ChartDeleteDialogComponent {
	public submitting = false;

	constructor(
		@Inject(MAT_DIALOG_DATA) public data: { query: SavedQuery; connectionId: string },
		private dialogRef: MatDialogRef<ChartDeleteDialogComponent>,
		private _savedQueries: SavedQueriesService,
		private angulartics2: Angulartics2,
	) {}

	onDelete(): void {
		this.submitting = true;
		this._savedQueries.deleteSavedQuery(this.data.connectionId, this.data.query.id).subscribe({
			next: () => {
				this.angulartics2.eventTrack.next({
					action: 'Charts: saved query deleted successfully',
				});
				this.submitting = false;
				this.dialogRef.close(true);
			},
			error: () => {
				this.submitting = false;
			},
		});
	}
}
