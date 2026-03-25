import { Component, Inject, inject, signal } from '@angular/core';
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
	imports: [MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, FormsModule],
})
export class GroupNameEditDialogComponent {
	private _usersService = inject(UsersService);
	protected dialogRef = inject<MatDialogRef<Self>>(MatDialogRef);

	protected groupTitle: string;
	protected submitting = signal(false);

	constructor(@Inject(MAT_DIALOG_DATA) public group: { id: string; title: string }) {
		this.groupTitle = this.group.title;
	}

	async addGroup() {
		this.submitting.set(true);
		try {
			await this._usersService.editGroupName(this.group.id, this.groupTitle);
			this.dialogRef.close();
		} finally {
			this.submitting.set(false);
		}
	}
}
