import { CommonModule } from '@angular/common';
import { Component, Inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Angulartics2 } from 'angulartics2';
import { Dashboard } from 'src/app/models/dashboard';
import { DashboardsService } from 'src/app/services/dashboards.service';

@Component({
	selector: 'app-dashboard-delete-dialog',
	templateUrl: './dashboard-delete-dialog.component.html',
	styleUrls: ['./dashboard-delete-dialog.component.css'],
	imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
})
export class DashboardDeleteDialogComponent {
	protected submitting = signal(false);

	constructor(
		@Inject(MAT_DIALOG_DATA) public data: { dashboard: Dashboard; connectionId: string },
		private dialogRef: MatDialogRef<DashboardDeleteDialogComponent>,
		private _dashboards: DashboardsService,
		private angulartics2: Angulartics2,
	) {}

	async onDelete(): Promise<void> {
		this.submitting.set(true);
		const result = await this._dashboards.deleteDashboard(this.data.connectionId, this.data.dashboard.id);
		if (result) {
			this.angulartics2.eventTrack.next({
				action: 'Dashboards: dashboard deleted successfully',
			});
			this.dialogRef.close(true);
		}
		this.submitting.set(false);
	}
}
