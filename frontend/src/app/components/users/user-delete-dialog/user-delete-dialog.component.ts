import { Component, Inject, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { UsersService } from 'src/app/services/users.service';

@Component({
	selector: 'app-user-delete-dialog',
	templateUrl: './user-delete-dialog.component.html',
	styleUrls: ['./user-delete-dialog.component.css'],
	imports: [MatButtonModule, MatDialogModule],
})
export class UserDeleteDialogComponent {
	private _usersService = inject(UsersService);
	protected dialogRef = inject<MatDialogRef<UserDeleteDialogComponent>>(MatDialogRef);

	protected submitting = signal(false);

	// biome-ignore lint/suspicious/noExplicitAny: legacy dialog data type
	constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

	async deleteGroupUser() {
		this.submitting.set(true);
		try {
			await this._usersService.deleteGroupUser(this.data.user.email, this.data.group.id);
			this.dialogRef.close();
		} finally {
			this.submitting.set(false);
		}
	}
}
