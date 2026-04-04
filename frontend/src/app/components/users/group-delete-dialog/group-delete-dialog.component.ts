import { Component, Inject, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Angulartics2 } from 'angulartics2';
import posthog from 'posthog-js';
import { UsersService } from 'src/app/services/users.service';

@Component({
	selector: 'app-group-delete-dialog',
	templateUrl: './group-delete-dialog.component.html',
	styleUrls: ['./group-delete-dialog.component.css'],
	imports: [MatDialogModule, MatButtonModule],
})
export class GroupDeleteDialogComponent {
	private _usersService = inject(UsersService);
	private _angulartics2 = inject(Angulartics2);
	protected dialogRef = inject<MatDialogRef<GroupDeleteDialogComponent>>(MatDialogRef);

	protected submitting = signal(false);

	// biome-ignore lint/suspicious/noExplicitAny: legacy dialog data type
	constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

	async deleteUsersGroup(id: string) {
		this.submitting.set(true);
		try {
			await this._usersService.deleteGroup(id);
			this.dialogRef.close();
			this._angulartics2.eventTrack.next({
				action: 'User groups: user group was deleted successfully',
			});
			posthog.capture('User groups: user group was deleted successfully');
		} finally {
			this.submitting.set(false);
		}
	}
}
