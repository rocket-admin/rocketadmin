import { CommonModule } from '@angular/common';
import { Component, computed, Inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Angulartics2 } from 'angulartics2';
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
		MatDialogModule,
		MatButtonModule,
		MatFormFieldModule,
		MatInputModule,
		MatSelectModule,
	],
})
export class WidgetEditDialogComponent implements OnInit {
	protected submitting = signal(false);
	protected form!: FormGroup;
	protected isEdit: boolean;

	protected chartTypes = [
		{ value: 'bar', label: 'Bar Chart' },
		{ value: 'line', label: 'Line Chart' },
		{ value: 'pie', label: 'Pie Chart' },
		{ value: 'doughnut', label: 'Doughnut Chart' },
		{ value: 'polarArea', label: 'Polar Area Chart' },
	];

	protected savedQueries = computed(() => this._savedQueries.savedQueries());

	constructor(
		@Inject(MAT_DIALOG_DATA)
		public data: { connectionId: string; dashboardId: string; widget: DashboardWidget | null },
		private dialogRef: MatDialogRef<WidgetEditDialogComponent>,
		private _dashboards: DashboardsService,
		private _savedQueries: SavedQueriesService,
		private fb: FormBuilder,
		private angulartics2: Angulartics2,
	) {
		this.isEdit = !!data.widget;
	}

	ngOnInit(): void {
		this._savedQueries.setActiveConnection(this.data.connectionId);

		const widget = this.data.widget;
		this.form = this.fb.group({
			name: [widget?.name || '', [Validators.required, Validators.maxLength(255)]],
			description: [widget?.description || '', [Validators.maxLength(1000)]],
			chart_type: [widget?.chart_type || 'bar', [Validators.required]],
			query_id: [widget?.query_id || '', [Validators.required]],
		});
	}

	onSubmit(): void {
		if (this.form.invalid) return;

		this.submitting.set(true);
		const formValue = this.form.value;

		const payload: Record<string, unknown> = {
			name: formValue.name,
			description: formValue.description || undefined,
			widget_type: 'chart',
			chart_type: formValue.chart_type,
			query_id: formValue.query_id,
		};

		if (!this.isEdit) {
			payload['position_x'] = 0;
			payload['position_y'] = 0;
			payload['width'] = 4;
			payload['height'] = 4;
		}

		if (this.isEdit) {
			this._dashboards
				.updateWidget(this.data.connectionId, this.data.dashboardId, this.data.widget!.id, payload as any)
				.subscribe({
					next: () => {
						this.angulartics2.eventTrack.next({
							action: 'Dashboards: chart updated successfully',
						});
						this.submitting.set(false);
						this.dialogRef.close(true);
					},
					error: () => {
						this.submitting.set(false);
					},
				});
		} else {
			this._dashboards.createWidget(this.data.connectionId, this.data.dashboardId, payload as any).subscribe({
				next: () => {
					this.angulartics2.eventTrack.next({
						action: 'Dashboards: chart created successfully',
					});
					this.submitting.set(false);
					this.dialogRef.close(true);
				},
				error: () => {
					this.submitting.set(false);
				},
			});
		}
	}
}
