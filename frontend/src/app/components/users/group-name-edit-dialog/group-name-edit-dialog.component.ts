import { NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CodeEditorModule } from '@ngstack/code-editor';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { UsersService } from 'src/app/services/users.service';
import { GroupNameEditDialogComponent as Self } from './group-name-edit-dialog.component';

@Component({
	selector: 'app-group-name-edit-dialog',
	templateUrl: './group-name-edit-dialog.component.html',
	styleUrls: ['./group-name-edit-dialog.component.css'],
	imports: [NgIf, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, FormsModule, CodeEditorModule],
})
export class GroupNameEditDialogComponent {
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
		@Inject(MAT_DIALOG_DATA) public group: { id: string; title: string; cedarPolicy?: string | null },
		public _usersService: UsersService,
		public dialogRef: MatDialogRef<Self>,
		private _uiSettings: UiSettingsService,
	) {
		this.codeEditorTheme = this._uiSettings.isDarkMode ? 'vs-dark' : 'vs';
	}

	ngOnInit(): void {
		this.groupTitle = this.group.title;
		this.cedarPolicy = this.group.cedarPolicy || '';
		this._usersService.cast.subscribe();
		this.cedarPolicyModel = {
			language: 'plaintext',
			uri: `cedar-policy-edit-${this.group.id}.cedar`,
			value: this.cedarPolicy,
		};
	}

	onCedarPolicyChange(value: string) {
		this.cedarPolicy = value;
	}

	addGroup() {
		this.submitting = true;
		this._usersService.editUsersGroupName(this.group.id, this.groupTitle, this.cedarPolicy || null).subscribe(
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
