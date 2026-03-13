import { NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CodeEditorModule, CodeEditorService } from '@ngstack/code-editor';
import { Angulartics2 } from 'angulartics2';
import posthog from 'posthog-js';
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

@Component({
	selector: 'app-group-add-dialog',
	imports: [
		NgIf,
		FormsModule,
		MatDialogModule,
		MatFormFieldModule,
		MatInputModule,
		MatButtonModule,
		MatButtonToggleModule,
		CodeEditorModule,
		CedarPolicyListComponent,
	],
	templateUrl: './group-add-dialog.component.html',
	styleUrls: ['./group-add-dialog.component.css'],
})
export class GroupAddDialogComponent implements OnInit {
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
		private _connections: ConnectionsService,
		public _usersService: UsersService,
		public dialogRef: MatDialogRef<GroupAddDialogComponent>,
		private angulartics2: Angulartics2,
		private _uiSettings: UiSettingsService,
		private _tablesService: TablesService,
		private _editorService: CodeEditorService,
	) {
		this.codeEditorTheme = this._uiSettings.isDarkMode ? 'vs-dark' : 'vs';
		this._editorService.loaded.subscribe(({ monaco }) => registerCedarLanguage(monaco));
	}

	ngOnInit(): void {
		this.connectionID = this._connections.currentConnectionID;
		this._usersService.cast.subscribe();
		this.cedarPolicyModel = {
			language: 'cedar',
			uri: 'cedar-policy-create.cedar',
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
			const permissions = policyItemsToPermissions(this.policyItems, this.connectionID, '__new__', this.allTables);
			this.cedarPolicy = generateCedarPolicy(this.connectionID, permissions);
			this.cedarPolicyModel = {
				language: 'cedar',
				uri: `cedar-policy-create-${Date.now()}.cedar`,
				value: this.cedarPolicy,
			};
		} else {
			// Code → Form: parse cedar text into policy items
			const parsed = parseCedarPolicy(this.cedarPolicy, this.connectionID, '__new__', this.allTables);
			this.policyItems = permissionsToPolicyItems(parsed);
		}

		this.editorMode = mode;
	}

	addGroup() {
		this.submitting = true;

		// If in form mode, generate cedar policy from policy items
		if (this.editorMode === 'form') {
			const permissions = policyItemsToPermissions(this.policyItems, this.connectionID, '__new__', this.allTables);
			this.cedarPolicy = generateCedarPolicy(this.connectionID, permissions);
		}

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
