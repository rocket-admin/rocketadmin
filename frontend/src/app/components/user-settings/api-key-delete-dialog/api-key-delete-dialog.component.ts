import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ApiKey } from 'src/app/models/user';
import { UserService } from 'src/app/services/user.service';

@Component({
	selector: 'app-api-key-delete-dialog',
	templateUrl: './api-key-delete-dialog.component.html',
	styleUrl: './api-key-delete-dialog.component.css',
	imports: [CommonModule, MatDialogModule, MatButtonModule],
})
export class ApiKeyDeleteDialogComponent {
	public submitting: boolean = false;

	constructor(
		@Inject(MAT_DIALOG_DATA) public data: ApiKey,
		private _userService: UserService,
		public dialogRef: MatDialogRef<ApiKeyDeleteDialogComponent>,
	) {}

	deleteAPIkey() {
		this.submitting = true;
		this._userService.deleteAPIkey(this.data).subscribe(
			() => {
				this.dialogRef.close();
				this.submitting = false;
			},
			() => {},
			() => {
				this.submitting = false;
			},
		);
	}
}
