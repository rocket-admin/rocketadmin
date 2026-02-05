import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Angulartics2 } from 'angulartics2';
import { Dashboard } from 'src/app/models/dashboard';
import { DashboardsService } from 'src/app/services/dashboards.service';

@Component({
	selector: 'app-dashboard-edit-dialog',
	templateUrl: './dashboard-edit-dialog.component.html',
	styleUrls: ['./dashboard-edit-dialog.component.css'],
	imports: [
		CommonModule,
		ReactiveFormsModule,
		MatDialogModule,
		MatButtonModule,
		MatIconModule,
		MatFormFieldModule,
		MatInputModule,
	],
})
export class DashboardEditDialogComponent implements OnInit {
	protected submitting = signal(false);
	protected form!: FormGroup;
	protected isEdit: boolean;

	constructor(
		@Inject(MAT_DIALOG_DATA) public data: { connectionId: string; dashboard: Dashboard | null },
		private dialogRef: MatDialogRef<DashboardEditDialogComponent>,
		private _dashboards: DashboardsService,
		private fb: FormBuilder,
		private angulartics2: Angulartics2,
	) {
		this.isEdit = !!data.dashboard;
	}

	ngOnInit(): void {
		this.form = this.fb.group({
			name: [this.data.dashboard?.name || '', [Validators.required, Validators.maxLength(255)]],
			description: [this.data.dashboard?.description || '', [Validators.maxLength(1000)]],
		});
	}

	async onSubmit(): Promise<void> {
		if (this.form.invalid) return;

		this.submitting.set(true);
		const payload = this.form.value;

		if (this.isEdit) {
			const result = await this._dashboards.updateDashboard(this.data.connectionId, this.data.dashboard!.id, payload);
			if (result) {
				this.angulartics2.eventTrack.next({
					action: 'Dashboards: dashboard updated successfully',
				});
				this.dialogRef.close(true);
			}
		} else {
			const result = await this._dashboards.createDashboard(this.data.connectionId, payload);
			if (result) {
				this.angulartics2.eventTrack.next({
					action: 'Dashboards: dashboard created successfully',
				});
				this.dialogRef.close(true);
			}
		}
		this.submitting.set(false);
	}
}
