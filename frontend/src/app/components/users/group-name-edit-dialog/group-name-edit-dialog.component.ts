import { NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UsersService } from 'src/app/services/users.service';
import { GroupNameEditDialogComponent as Self } from './group-name-edit-dialog.component';

@Component({
	selector: 'app-group-name-edit-dialog',
	templateUrl: './group-name-edit-dialog.component.html',
	styleUrls: ['./group-name-edit-dialog.component.css'],
	imports: [NgIf, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, FormsModule],
})
export class GroupNameEditDialogComponent {
	public groupTitle: string = '';
	public submitting: boolean = false;

	constructor(
		@Inject(MAT_DIALOG_DATA) public group: { id: string; title: string },
		public _usersService: UsersService,
		public dialogRef: MatDialogRef<Self>,
	) {}

	ngOnInit(): void {
		this.groupTitle = this.group.title;
		this._usersService.cast.subscribe();
	}

	addGroup() {
		this.submitting = true;
		this._usersService.editUsersGroupName(this.group.id, this.groupTitle).subscribe(
			() => {
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
