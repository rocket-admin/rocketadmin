import { NgIf } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CodeEditorModule, CodeEditorService } from '@ngstack/code-editor';
import { forkJoin } from 'rxjs';
import { registerCedarLanguage } from 'src/app/lib/cedar-monaco-language';
import { CedarPolicyItem, permissionsToPolicyItems, policyItemsToCedarPolicy } from 'src/app/lib/cedar-policy-items';
import { parseCedarDashboardItems, parseCedarPolicy } from 'src/app/lib/cedar-policy-parser';
import { normalizeTableName } from 'src/app/lib/normalize';
import { Dashboard } from 'src/app/models/dashboard';
import { TablePermission } from 'src/app/models/user';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DashboardsService } from 'src/app/services/dashboards.service';
import { TablesService } from 'src/app/services/tables.service';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { UsersService } from 'src/app/services/users.service';
import {
	AvailableDashboard,
	AvailableTable,
	CedarPolicyListComponent,
} from '../cedar-policy-list/cedar-policy-list.component';
import { CedarPolicyEditorDialogComponent as Self } from './cedar-policy-editor-dialog.component';

export interface CedarPolicyEditorDialogData {
	groupId: string;
	groupTitle: string;
	cedarPolicy?: string | null;
}

@Component({
	selector: 'app-cedar-policy-editor-dialog',
	templateUrl: './cedar-policy-editor-dialog.component.html',
	styleUrls: ['./cedar-policy-editor-dialog.component.css'],
	imports: [NgIf, MatDialogModule, MatButtonModule, MatButtonToggleModule, CodeEditorModule, CedarPolicyListComponent],
})
export class CedarPolicyEditorDialogComponent implements OnInit {
	public connectionID: string;
	public cedarPolicy: string = '';
	public submitting: boolean = false;

	public editorMode: 'form' | 'code' = 'form';
	public policyItems: CedarPolicyItem[] = [];
	public availableTables: AvailableTable[] = [];
	public availableDashboards: AvailableDashboard[] = [];
	public allTables: TablePermission[] = [];
	public loading: boolean = true;

	public cedarPolicyModel: object;
	public codeEditorOptions = {
		minimap: { enabled: false },
		automaticLayout: true,
		scrollBeyondLastLine: false,
		wordWrap: 'on',
	};
	public codeEditorTheme: string;

	constructor(
		@Inject(MAT_DIALOG_DATA) public data: CedarPolicyEditorDialogData,
		public dialogRef: MatDialogRef<Self>,
		private _connections: ConnectionsService,
		private _usersService: UsersService,
		private _uiSettings: UiSettingsService,
		private _tablesService: TablesService,
		private _dashboardsService: DashboardsService,
		private _editorService: CodeEditorService,
	) {
		this.codeEditorTheme = this._uiSettings.isDarkMode ? 'vs-dark' : 'vs';
		this._editorService.loaded.subscribe(({ monaco }) => registerCedarLanguage(monaco));
	}

	ngOnInit(): void {
		this.connectionID = this._connections.currentConnectionID;
		this.cedarPolicy = this.data.cedarPolicy || '';
		this.cedarPolicyModel = {
			language: 'cedar',
			uri: `cedar-policy-${this.data.groupId}.cedar`,
			value: this.cedarPolicy,
		};

		this._dashboardsService.setActiveConnection(this.connectionID);

		forkJoin([this._tablesService.fetchTables(this.connectionID)]).subscribe(([tables]) => {
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

			this.availableDashboards = this._dashboardsService.dashboards().map((d: Dashboard) => ({
				id: d.id,
				name: d.name,
			}));

			this.loading = false;

			if (this.cedarPolicy) {
				const parsed = parseCedarPolicy(this.cedarPolicy, this.connectionID, this.data.groupId, this.allTables);
				const dashboardItems = parseCedarDashboardItems(this.cedarPolicy, this.connectionID);
				this.policyItems = [...permissionsToPolicyItems(parsed), ...dashboardItems];
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
			this.cedarPolicy = policyItemsToCedarPolicy(this.policyItems, this.connectionID, this.data.groupId);
			this.cedarPolicyModel = {
				language: 'cedar',
				uri: `cedar-policy-${this.data.groupId}-${Date.now()}.cedar`,
				value: this.cedarPolicy,
			};
		} else {
			const parsed = parseCedarPolicy(this.cedarPolicy, this.connectionID, this.data.groupId, this.allTables);
			const dashboardItems = parseCedarDashboardItems(this.cedarPolicy, this.connectionID);
			this.policyItems = [...permissionsToPolicyItems(parsed), ...dashboardItems];
		}

		this.editorMode = mode;
	}

	savePolicy() {
		this.submitting = true;

		if (this.editorMode === 'form') {
			this.cedarPolicy = policyItemsToCedarPolicy(this.policyItems, this.connectionID, this.data.groupId);
		}

		if (!this.cedarPolicy) {
			this.submitting = false;
			this.dialogRef.close();
			return;
		}

		this._usersService.saveCedarPolicy(this.connectionID, this.data.groupId, this.cedarPolicy).subscribe(
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
