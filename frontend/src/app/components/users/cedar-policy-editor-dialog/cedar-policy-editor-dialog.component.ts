import { NgIf } from '@angular/common';
import { Component, DestroyRef, Inject, inject, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CodeEditorModule, CodeEditorService } from '@ngstack/code-editor';
import { take } from 'rxjs';
import { registerCedarLanguage } from 'src/app/lib/cedar-monaco-language';
import { CedarPolicyItem, permissionsToPolicyItems, policyItemsToCedarPolicy } from 'src/app/lib/cedar-policy-items';
import { canRepresentAsForm, parseCedarDashboardItems, parseCedarPolicy } from 'src/app/lib/cedar-policy-parser';
import { normalizeTableName } from 'src/app/lib/normalize';
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
	imports: [
		NgIf,
		FormsModule,
		MatDialogModule,
		MatButtonModule,
		MatButtonToggleModule,
		MatIconModule,
		CodeEditorModule,
		CedarPolicyListComponent,
	],
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
	public formParseError: boolean = false;

	@ViewChild(CedarPolicyListComponent) policyList?: CedarPolicyListComponent;

	public cedarPolicyModel: object;
	public codeEditorOptions = {
		minimap: { enabled: false },
		automaticLayout: true,
		scrollBeyondLastLine: false,
		wordWrap: 'on',
	};
	public codeEditorTheme: string;

	private _destroyRef = inject(DestroyRef);

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
		this._editorService.loaded.pipe(take(1)).subscribe(({ monaco }) => registerCedarLanguage(monaco));

		this.dialogRef.disableClose = true;
		this.dialogRef.backdropClick().pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => {
			this.confirmClose();
		});
		this.dialogRef.keydownEvents().pipe(takeUntilDestroyed(this._destroyRef)).subscribe((event) => {
			if (event.key === 'Escape') {
				this.confirmClose();
			}
		});
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

		this._tablesService
			.fetchTables(this.connectionID)
			.pipe(takeUntilDestroyed(this._destroyRef))
			.subscribe((tables) => {
				this.allTables = [];
				this.availableTables = [];
				for (const t of tables) {
					const displayName = t.display_name || normalizeTableName(t.table);
					this.allTables.push({
						tableName: t.table,
						display_name: displayName,
						accessLevel: { visibility: false, readonly: false, add: false, delete: false, edit: false },
					});
					this.availableTables.push({ tableName: t.table, displayName });
				}

				this.availableDashboards = this._dashboardsService.dashboards().map((d) => ({
					id: d.id,
					name: d.name,
				}));

				this.loading = false;

				if (this.cedarPolicy) {
					this.formParseError = !canRepresentAsForm(this.cedarPolicy);
					if (this.formParseError) {
						this.editorMode = 'code';
					} else {
						this.policyItems = this._parseCedarToPolicyItems();
					}
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
			this.formParseError = false;
		} else {
			this.formParseError = !canRepresentAsForm(this.cedarPolicy);
			if (this.formParseError) return;
			this.policyItems = this._parseCedarToPolicyItems();
		}

		this.editorMode = mode;
	}

	confirmClose() {
		if (this.editorMode === 'form' && this.policyList?.hasPendingChanges()) {
			const discard = confirm('You have an unsaved policy in the form. Discard it and close?');
			if (!discard) return;
			this.policyList.discardPending();
		}
		this.dialogRef.close();
	}

	savePolicy() {
		if (this.editorMode === 'form' && this.policyList?.hasPendingChanges()) {
			const discard = confirm('You have an unsaved policy in the form. Discard it and save?');
			if (!discard) return;
			this.policyList.discardPending();
		}

		this.submitting = true;

		if (this.editorMode === 'form') {
			this.cedarPolicy = policyItemsToCedarPolicy(this.policyItems, this.connectionID, this.data.groupId);
		}

		if (!this.cedarPolicy) {
			this.submitting = false;
			this.dialogRef.close();
			return;
		}

		this._usersService
			.saveCedarPolicy(this.connectionID, this.data.groupId, this.cedarPolicy)
			.pipe(takeUntilDestroyed(this._destroyRef))
			.subscribe({
				next: () => {
					this.submitting = false;
					this.dialogRef.close();
				},
				complete: () => {
					this.submitting = false;
				},
			});
	}

	private _parseCedarToPolicyItems(): CedarPolicyItem[] {
		const parsed = parseCedarPolicy(this.cedarPolicy, this.connectionID, this.data.groupId, this.allTables);
		const dashboardItems = parseCedarDashboardItems(this.cedarPolicy, this.connectionID);
		return [...permissionsToPolicyItems(parsed), ...dashboardItems];
	}
}
