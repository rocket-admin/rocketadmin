import { NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CodeEditorModule } from '@ngstack/code-editor';
import { Angulartics2 } from 'angulartics2';
import posthog from 'posthog-js';
import { ConnectionsService } from 'src/app/services/connections.service';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { UsersService } from 'src/app/services/users.service';

@Component({
	selector: 'app-group-add-dialog',
	imports: [NgIf, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, CodeEditorModule],
	templateUrl: './group-add-dialog.component.html',
	styleUrls: ['./group-add-dialog.component.css'],
})
export class GroupAddDialogComponent implements OnInit {
	public connectionID: string;
	public groupTitle: string = '';
	public cedarPolicy: string = '';
	public submitting: boolean = false;

	public cedarPolicyModel: object;
	public codeEditorOptions = {
		minimap: { enabled: false },
		automaticLayout: true,
		scrollBeyondLastLine: false,
		wordWrap: 'on',
	};
	public codeEditorTheme: string;

	constructor(
		private _connections: ConnectionsService,
		public _usersService: UsersService,
		public dialogRef: MatDialogRef<GroupAddDialogComponent>,
		private angulartics2: Angulartics2,
		private _uiSettings: UiSettingsService,
	) {
		this.codeEditorTheme = this._uiSettings.isDarkMode ? 'vs-dark' : 'vs';
	}

	ngOnInit(): void {
		this.connectionID = this._connections.currentConnectionID;
		this._usersService.cast.subscribe();
		this.cedarPolicyModel = {
			language: 'plaintext',
			uri: 'cedar-policy-create.cedar',
			value: this.cedarPolicy,
		};
	}

	onCedarPolicyChange(value: string) {
		this.cedarPolicy = value;
	}

	addGroup() {
		this.submitting = true;
		this._usersService.createUsersGroup(this.connectionID, this.groupTitle, this.cedarPolicy || null).subscribe(
			() => {
				this.submitting = false;
				this.dialogRef.close();
				this.angulartics2.eventTrack.next({
					action: 'User groups: user groups was created successfully',
				});
				posthog.capture('User groups: user groups was created successfully');
			},
			() => {},
			() => {
				this.submitting = false;
			},
		);
	}
}
