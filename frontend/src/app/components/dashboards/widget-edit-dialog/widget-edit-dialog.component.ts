import { CommonModule } from '@angular/common';
import { Component, computed, Inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterModule } from '@angular/router';
import { Angulartics2 } from 'angulartics2';
import posthog from 'posthog-js';
import { DashboardWidget } from 'src/app/models/dashboard';
import { DashboardsService } from 'src/app/services/dashboards.service';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';

@Component({
	selector: 'app-widget-edit-dialog',
	templateUrl: './widget-edit-dialog.component.html',
	styleUrls: ['./widget-edit-dialog.component.css'],
	imports: [
		CommonModule,
		ReactiveFormsModule,
		RouterModule,
		MatDialogModule,
		MatButtonModule,
		MatDividerModule,
		MatFormFieldModule,
		MatIconModule,
		MatSelectModule,
	],
})
export class WidgetEditDialogComponent implements OnInit {
	protected submitting = signal(false);
	protected form!: FormGroup;
	protected isEdit: boolean;

	protected savedQueries = computed(() => this._savedQueries.savedQueries());

	constructor(
		@Inject(MAT_DIALOG_DATA)
		public data: { connectionId: string; dashboardId: string; widget: DashboardWidget | null },
		public dialogRef: MatDialogRef<WidgetEditDialogComponent>,
		private _dashboards: DashboardsService,
		private _savedQueries: SavedQueriesService,
		private _router: Router,
		private fb: FormBuilder,
		private angulartics2: Angulartics2,
	) {
		this.isEdit = !!data.widget;
	}

	ngOnInit(): void {
		this._savedQueries.setActiveConnection(this.data.connectionId);

		const widget = this.data.widget;

		this.form = this.fb.group({
			query_id: [widget?.query_id || '', [Validators.required]],
		});
	}

	async onSubmit(): Promise<void> {
		if (this.form.invalid) return;

		this.submitting.set(true);
		const formValue = this.form.value;

		if (this.isEdit) {
			const payload = {
				query_id: formValue.query_id,
			};

			const result = await this._dashboards.updateWidget(
				this.data.connectionId,
				this.data.dashboardId,
				this.data.widget!.id,
				payload,
			);
			if (result) {
				this.angulartics2.eventTrack.next({
					action: 'Dashboards: widget updated successfully',
				});
				posthog.capture('Dashboards: widget updated successfully');
				this.dialogRef.close(true);
			}
		} else {
			const payload = {
				query_id: formValue.query_id,
				position_x: 0,
				position_y: 0,
				width: 4,
				height: 4,
			};

			const result = await this._dashboards.createWidget(this.data.connectionId, this.data.dashboardId, payload);
			if (result) {
				this.angulartics2.eventTrack.next({
					action: 'Dashboards: widget created successfully',
				});
				posthog.capture('Dashboards: widget created successfully');
				this.dialogRef.close(true);
			}
		}
		this.submitting.set(false);
	}

	navigateToCreateQuery(): void {
		this.dialogRef.close();
		this._router.navigate(['/charts', this.data.connectionId, 'new']);
	}
}
