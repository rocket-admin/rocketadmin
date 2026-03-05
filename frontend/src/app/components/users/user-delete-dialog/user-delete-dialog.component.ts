import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { UsersService } from 'src/app/services/users.service';

@Component({
	selector: 'app-user-delete-dialog',
	templateUrl: './user-delete-dialog.component.html',
	styleUrls: ['./user-delete-dialog.component.css'],
	imports: [CommonModule, MatButtonModule, MatDialogModule],
})
export class UserDeleteDialogComponent implements OnInit {
	public submitting: boolean = false;

	constructor(
		@Inject(MAT_DIALOG_DATA) public data: any,
		private _usersService: UsersService,
		public dialogRef: MatDialogRef<UserDeleteDialogComponent>,
	) {}

	ngOnInit(): void {
		this._usersService.cast.subscribe();
	}

	deleteGroupUser() {
		this.submitting = true;
		this._usersService.deleteGroupUser(this.data.user.email, this.data.group.id).subscribe(
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
