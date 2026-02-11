import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Angulartics2 } from 'angulartics2';
import posthog from 'posthog-js';
import { CompanyService } from 'src/app/services/company.service';

@Component({
	selector: 'app-revoke-invitation-dialog',
	templateUrl: './revoke-invitation-dialog.component.html',
	styleUrls: ['./revoke-invitation-dialog.component.css'],
	imports: [CommonModule, MatDialogModule, MatButtonModule],
})
export class RevokeInvitationDialogComponent {
	public submitting: boolean = false;

	constructor(
		@Inject(MAT_DIALOG_DATA) public data: any,
		public dialogRef: MatDialogRef<RevokeInvitationDialogComponent>,
		private _company: CompanyService,
		private angulartics2: Angulartics2,
	) {}

	revokeInvitation() {
		this._company.revokeInvitation(this.data.companyId, this.data.userEmail).subscribe(
			() => {
				this.angulartics2.eventTrack.next({
					action: 'Company: invitation is revoked successfully',
				});
				posthog.capture('Company: invitation is revoked successfully');

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
