import { CommonModule } from '@angular/common';
import { Component, Inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Angulartics2 } from 'angulartics2';
import { DashboardWidget } from 'src/app/models/dashboard';
import { DashboardsService } from 'src/app/services/dashboards.service';

@Component({
	selector: 'app-widget-delete-dialog',
	templateUrl: './widget-delete-dialog.component.html',
	styleUrls: ['./widget-delete-dialog.component.css'],
	imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
})
export class WidgetDeleteDialogComponent {
	protected submitting = signal(false);

	constructor(
		@Inject(MAT_DIALOG_DATA)
		public data: { connectionId: string; dashboardId: string; widget: DashboardWidget },
		private dialogRef: MatDialogRef<WidgetDeleteDialogComponent>,
		private _dashboards: DashboardsService,
		private angulartics2: Angulartics2,
	) {}

	async onDelete(): Promise<void> {
		this.submitting.set(true);
		const result = await this._dashboards.deleteWidget(
			this.data.connectionId,
			this.data.dashboardId,
			this.data.widget.id,
		);
		if (result) {
			this.angulartics2.eventTrack.next({
				action: 'Dashboards: widget deleted successfully',
			});
			this.dialogRef.close(true);
		}
		this.submitting.set(false);
	}
}
