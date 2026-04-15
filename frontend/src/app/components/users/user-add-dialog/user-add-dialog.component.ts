import { Component, Inject, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { Angulartics2 } from 'angulartics2';
import posthog from 'posthog-js';
import { UsersService } from 'src/app/services/users.service';

@Component({
	selector: 'app-user-add-dialog',
	templateUrl: './user-add-dialog.component.html',
	styleUrls: ['./user-add-dialog.component.css'],
	imports: [MatDialogModule, FormsModule, MatFormFieldModule, MatSelectModule, MatButtonModule, RouterModule],
})
export class UserAddDialogComponent {
	private _usersService = inject(UsersService);
	private _angulartics2 = inject(Angulartics2);
	private _dialogRef = inject<MatDialogRef<UserAddDialogComponent>>(MatDialogRef);

	protected submitting = signal(false);
	protected groupUserEmail = '';

	// biome-ignore lint/suspicious/noExplicitAny: legacy dialog data type
	constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

	async joinGroupUser() {
		this.submitting.set(true);
		try {
			await this._usersService.addGroupUser(this.data.group.id, this.groupUserEmail);
			this._dialogRef.close();
			this._angulartics2.eventTrack.next({
				action: 'User groups: user was added to group successfully',
			});
			posthog.capture('User groups: user was added to group successfully');
		} finally {
			this.submitting.set(false);
		}
	}
}
