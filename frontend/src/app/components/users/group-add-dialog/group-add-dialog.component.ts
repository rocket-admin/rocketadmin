import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Angulartics2 } from 'angulartics2';
import posthog from 'posthog-js';
import { ConnectionsService } from 'src/app/services/connections.service';
import { UsersService } from 'src/app/services/users.service';

@Component({
	selector: 'app-group-add-dialog',
	imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
	templateUrl: './group-add-dialog.component.html',
	styleUrls: ['./group-add-dialog.component.css'],
})
export class GroupAddDialogComponent {
	private _connections = inject(ConnectionsService);
	private _usersService = inject(UsersService);
	private _angulartics2 = inject(Angulartics2);
	protected dialogRef = inject<MatDialogRef<GroupAddDialogComponent>>(MatDialogRef);

	protected connectionID = this._connections.currentConnectionID;
	protected groupTitle = '';
	protected submitting = signal(false);

	async addGroup() {
		this.submitting.set(true);
		try {
			const res = await this._usersService.createGroup(this.connectionID, this.groupTitle);
			this.dialogRef.close(res);
			this._angulartics2.eventTrack.next({
				action: 'User groups: user groups was created successfully',
			});
			posthog.capture('User groups: user groups was created successfully');
		} finally {
			this.submitting.set(false);
		}
	}
}
