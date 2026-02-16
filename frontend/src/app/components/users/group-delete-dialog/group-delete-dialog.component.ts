import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Angulartics2 } from 'angulartics2';
import posthog from 'posthog-js';
import { UsersService } from 'src/app/services/users.service';

@Component({
	selector: 'app-group-delete-dialog',
	templateUrl: './group-delete-dialog.component.html',
	styleUrls: ['./group-delete-dialog.component.css'],
	imports: [CommonModule, MatDialogModule, MatButtonModule],
})
export class GroupDeleteDialogComponent implements OnInit {
	public submitting: boolean = false;

	constructor(
		@Inject(MAT_DIALOG_DATA) public data: any,
		private _usersService: UsersService,
		public dialogRef: MatDialogRef<GroupDeleteDialogComponent>,
		private angulartics2: Angulartics2,
	) {}

	ngOnInit(): void {
		this._usersService.cast.subscribe();
	}

	deleteUsersGroup(id: string) {
		this.submitting = true;
		this._usersService.deleteUsersGroup(id).subscribe(
			() => {
				this.dialogRef.close();
				this.submitting = false;
				this.angulartics2.eventTrack.next({
					action: 'User groups: user group was deleted successfully',
				});
				posthog.capture('User groups: user group was deleted successfully');
			},
			() => {},
			() => {
				this.submitting = false;
			},
		);
	}
}
