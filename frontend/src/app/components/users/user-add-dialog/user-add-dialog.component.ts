import { NgForOf, NgIf } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { Angulartics2 } from 'angulartics2';
import posthog from 'posthog-js';
import { CompanyService } from 'src/app/services/company.service';
import { UserService } from 'src/app/services/user.service';
import { UsersService } from 'src/app/services/users.service';

@Component({
	selector: 'app-user-add-dialog',
	templateUrl: './user-add-dialog.component.html',
	styleUrls: ['./user-add-dialog.component.css'],
	imports: [
		NgIf,
		NgForOf,
		MatDialogModule,
		FormsModule,
		MatFormFieldModule,
		MatSelectModule,
		MatButtonModule,
		RouterModule,
	],
})
export class UserAddDialogComponent implements OnInit {
	public submitting: boolean = false;
	public groupUserEmail: string = '';
	public availableMembers = null;

	constructor(
		@Inject(MAT_DIALOG_DATA) public data: any,
		private _usersService: UsersService,
		_userService: UserService,
		_company: CompanyService,
		private angulartics2: Angulartics2,
		private dialogRef: MatDialogRef<UserAddDialogComponent>,
	) {}

	ngOnInit(): void {}

	joinGroupUser() {
		this.submitting = true;
		this._usersService.addGroupUser(this.data.group.id, this.groupUserEmail).subscribe(
			(_res) => {
				this.dialogRef.close();
				this.submitting = false;
				this.angulartics2.eventTrack.next({
					action: 'User groups: user was added to group successfully',
				});
				posthog.capture('User groups: user was added to group successfully');
			},
			() => {},
			() => {
				this.submitting = false;
			},
		);
	}
}
