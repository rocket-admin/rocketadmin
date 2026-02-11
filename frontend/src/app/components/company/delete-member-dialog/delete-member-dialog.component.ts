import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Angulartics2 } from 'angulartics2';
import posthog from 'posthog-js';
import { CompanyService } from 'src/app/services/company.service';

@Component({
	selector: 'app-delete-member-dialog',
	templateUrl: './delete-member-dialog.component.html',
	styleUrls: ['./delete-member-dialog.component.css'],
	imports: [CommonModule, MatDialogModule, MatButtonModule],
})
export class DeleteMemberDialogComponent {
	public submitting: boolean = false;

	constructor(
		@Inject(MAT_DIALOG_DATA) public data: any,
		public dialogRef: MatDialogRef<DeleteMemberDialogComponent>,
		private _company: CompanyService,
		private angulartics2: Angulartics2,
	) {}

	deleteCompanyMember() {
		this.submitting = true;
		this._company
			.removeCompanyMemder(this.data.companyId, this.data.user.id, this.data.user.email, this.data.user.name)
			.subscribe(
				() => {
					this.angulartics2.eventTrack.next({
						action: 'Company: member is deleted successfully',
					});
					posthog.capture('Company: member is deleted successfully');
					this.submitting = false;
					this.dialogRef.close();
				},
				() => {},
				() => {
					this.submitting = false;
				},
			);
	}
}
