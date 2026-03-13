import { NgIf } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CodeEditorModule, CodeEditorService } from '@ngstack/code-editor';
import { registerCedarLanguage } from 'src/app/lib/cedar-monaco-language';
import { generateCedarPolicy } from 'src/app/lib/cedar-policy-generator';
import { CedarPolicyItem, permissionsToPolicyItems, policyItemsToPermissions } from 'src/app/lib/cedar-policy-items';
import { parseCedarPolicy } from 'src/app/lib/cedar-policy-parser';
import { normalizeTableName } from 'src/app/lib/normalize';
import { TablePermission } from 'src/app/models/user';
import { ConnectionsService } from 'src/app/services/connections.service';
import { TablesService } from 'src/app/services/tables.service';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { UsersService } from 'src/app/services/users.service';
import { AvailableTable, CedarPolicyListComponent } from '../cedar-policy-list/cedar-policy-list.component';
import { GroupNameEditDialogComponent as Self } from './group-name-edit-dialog.component';

@Component({
	selector: 'app-group-name-edit-dialog',
	templateUrl: './group-name-edit-dialog.component.html',
	styleUrls: ['./group-name-edit-dialog.component.css'],
	imports: [
		NgIf,
		MatDialogModule,
		MatFormFieldModule,
		MatInputModule,
		MatButtonModule,
		MatButtonToggleModule,
		FormsModule,
		CodeEditorModule,
		CedarPolicyListComponent,
	],
})
export class GroupNameEditDialogComponent implements OnInit {
	public connectionID: string;
	public groupTitle: string = '';
	public cedarPolicy: string = '';
	public submitting: boolean = false;

	public editorMode: 'form' | 'code' = 'form';
	public policyItems: CedarPolicyItem[] = [];
	public availableTables: AvailableTable[] = [];
	public allTables: TablePermission[] = [];
	public tablesLoading: boolean = true;

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
		private _connections: ConnectionsService,
		private _tablesService: TablesService,
		private _editorService: CodeEditorService,
	) {
		this.codeEditorTheme = this._uiSettings.isDarkMode ? 'vs-dark' : 'vs';
		this._editorService.loaded.subscribe(({ monaco }) => registerCedarLanguage(monaco));
	}

	ngOnInit(): void {
		this.connectionID = this._connections.currentConnectionID;
		this.groupTitle = this.group.title;
		this.cedarPolicy = this.group.cedarPolicy || '';
		this._usersService.cast.subscribe();
		this.cedarPolicyModel = {
			language: 'cedar',
			uri: `cedar-policy-edit-${this.group.id}.cedar`,
			value: this.cedarPolicy,
		};

		this._tablesService.fetchTables(this.connectionID).subscribe((tables) => {
			this.allTables = tables.map((t) => ({
				tableName: t.table,
				display_name: t.display_name || normalizeTableName(t.table),
				accessLevel: {
					visibility: false,
					readonly: false,
					add: false,
					delete: false,
					edit: false,
				},
			}));
			this.availableTables = tables.map((t) => ({
				tableName: t.table,
				displayName: t.display_name || normalizeTableName(t.table),
			}));
			this.tablesLoading = false;

			// Pre-populate form from existing cedar policy
			if (this.cedarPolicy) {
				const parsed = parseCedarPolicy(this.cedarPolicy, this.connectionID, this.group.id, this.allTables);
				this.policyItems = permissionsToPolicyItems(parsed);
			}
		});
	}

	onCedarPolicyChange(value: string) {
		this.cedarPolicy = value;
	}

	onPolicyItemsChange(items: CedarPolicyItem[]) {
		this.policyItems = items;
	}

	onEditorModeChange(mode: 'form' | 'code') {
		if (mode === this.editorMode) return;

		if (mode === 'code') {
			// Form → Code: convert policy items to cedar text
			const permissions = policyItemsToPermissions(this.policyItems, this.connectionID, this.group.id, this.allTables);
			this.cedarPolicy = generateCedarPolicy(this.connectionID, permissions);
			this.cedarPolicyModel = {
				language: 'cedar',
				uri: `cedar-policy-edit-${this.group.id}-${Date.now()}.cedar`,
				value: this.cedarPolicy,
			};
		} else {
			// Code → Form: parse cedar text into policy items
			const parsed = parseCedarPolicy(this.cedarPolicy, this.connectionID, this.group.id, this.allTables);
			this.policyItems = permissionsToPolicyItems(parsed);
		}

		this.editorMode = mode;
	}

	addGroup() {
		this.submitting = true;

		// If in form mode, generate cedar policy from policy items
		if (this.editorMode === 'form') {
			const permissions = policyItemsToPermissions(this.policyItems, this.connectionID, this.group.id, this.allTables);
			this.cedarPolicy = generateCedarPolicy(this.connectionID, permissions);
		}

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
