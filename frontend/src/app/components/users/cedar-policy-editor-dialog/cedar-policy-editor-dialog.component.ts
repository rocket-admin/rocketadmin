import { Component, DestroyRef, ElementRef, Inject, inject, OnInit, signal, ViewChild } from '@angular/core';
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
import { CedarValidatorService } from 'src/app/services/cedar-validator.service';
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
	private _connections = inject(ConnectionsService);
	private _usersService = inject(UsersService);
	private _uiSettings = inject(UiSettingsService);
	private _tablesService = inject(TablesService);
	private _dashboardsService = inject(DashboardsService);
	private _editorService = inject(CodeEditorService);
	private _cedarValidator = inject(CedarValidatorService);
	private _destroyRef = inject(DestroyRef);

	protected connectionID: string;
	protected cedarPolicy = signal('');
	protected submitting = signal(false);

	protected editorMode = signal<'form' | 'code'>('form');
	protected policyItems = signal<CedarPolicyItem[]>([]);
	protected availableTables = signal<AvailableTable[]>([]);
	protected availableDashboards = signal<AvailableDashboard[]>([]);
	protected allTables = signal<TablePermission[]>([]);
	protected loading = signal(true);
	protected formParseError = signal(false);
	protected validationErrors = signal<string[]>([]);
	protected validating = signal(false);

	@ViewChild(CedarPolicyListComponent) policyList?: CedarPolicyListComponent;
	@ViewChild('dialogContent', { read: ElementRef }) dialogContent?: ElementRef<HTMLElement>;

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
	) {
		this.codeEditorTheme = this._uiSettings.isDarkMode ? 'vs-dark' : 'vs';
		this._editorService.loaded.pipe(take(1)).subscribe(({ monaco }) => registerCedarLanguage(monaco));

		this.dialogRef.disableClose = true;
		this.dialogRef
			.backdropClick()
			.pipe(takeUntilDestroyed(this._destroyRef))
			.subscribe(() => {
				this.confirmClose();
			});
		this.dialogRef
			.keydownEvents()
			.pipe(takeUntilDestroyed(this._destroyRef))
			.subscribe((event) => {
				if (event.key === 'Escape') {
					this.confirmClose();
				}
			});
	}

	ngOnInit(): void {
		this.connectionID = this._connections.currentConnectionID;
		this.cedarPolicy.set(this.data.cedarPolicy || '');
		this.cedarPolicyModel = {
			language: 'cedar',
			uri: `cedar-policy-${this.data.groupId}.cedar`,
			value: this.cedarPolicy(),
		};

		this._dashboardsService.setActiveConnection(this.connectionID);

		this._tablesService
			.fetchTables(this.connectionID)
			.pipe(takeUntilDestroyed(this._destroyRef))
			.subscribe((tables) => {
				const newAllTables: TablePermission[] = [];
				const newAvailableTables: AvailableTable[] = [];
				for (const t of tables) {
					const displayName = t.display_name || normalizeTableName(t.table);
					newAllTables.push({
						tableName: t.table,
						display_name: displayName,
						accessLevel: { visibility: false, readonly: false, add: false, delete: false, edit: false },
					});
					newAvailableTables.push({ tableName: t.table, displayName });
				}

				this.allTables.set(newAllTables);
				this.availableTables.set(newAvailableTables);

				this.availableDashboards.set(
					this._dashboardsService.dashboards().map((d) => ({
						id: d.id,
						name: d.name,
					})),
				);

				this.loading.set(false);

				const policy = this.cedarPolicy();
				if (policy) {
					this.formParseError.set(!canRepresentAsForm(policy));
					if (this.formParseError()) {
						this.editorMode.set('code');
					} else {
						this.policyItems.set(this._parseCedarToPolicyItems());
					}
				}
			});
	}

	onCedarPolicyChange(value: string) {
		this.cedarPolicy.set(value);
		this.validationErrors.set([]);
	}

	onPolicyItemsChange(items: CedarPolicyItem[]) {
		this.policyItems.set(items);
	}

	async onEditorModeChange(mode: 'form' | 'code') {
		if (mode === this.editorMode()) return;

		if (mode === 'code') {
			this.cedarPolicy.set(policyItemsToCedarPolicy(this.policyItems(), this.connectionID, this.data.groupId));
			this.cedarPolicyModel = {
				language: 'cedar',
				uri: `cedar-policy-${this.data.groupId}-${Date.now()}.cedar`,
				value: this.cedarPolicy(),
			};
			this.formParseError.set(false);
			this.validationErrors.set([]);
		} else {
			const policy = this.cedarPolicy();
			const validation = await this._cedarValidator.validate(policy);
			if (!validation.valid) {
				this.validationErrors.set(validation.errors);
				return;
			}
			this.validationErrors.set([]);
			this.formParseError.set(!canRepresentAsForm(policy));
			if (this.formParseError()) return;
			this.policyItems.set(this._parseCedarToPolicyItems());
		}

		this.editorMode.set(mode);
	}

	confirmClose() {
		if (this.editorMode() === 'form' && this.policyList?.hasPendingChanges()) {
			const discard = confirm('You have an unsaved policy in the form. Discard it and close?');
			if (!discard) return;
			this.policyList.discardPending();
		}
		this.dialogRef.close();
	}

	async savePolicy() {
		if (this.editorMode() === 'form' && this.policyList?.hasPendingChanges()) {
			const discard = confirm('You have an unsaved policy in the form. Discard it and save?');
			if (!discard) return;
			this.policyList.discardPending();
		}

		this.submitting.set(true);

		if (this.editorMode() === 'form') {
			this.cedarPolicy.set(policyItemsToCedarPolicy(this.policyItems(), this.connectionID, this.data.groupId));
		}

		const policy = this.cedarPolicy();
		if (!policy) {
			this.submitting.set(false);
			this.dialogRef.close();
			return;
		}

		const validation = await this._cedarValidator.validate(policy);
		if (!validation.valid) {
			this.validationErrors.set(validation.errors);
			this.submitting.set(false);
			return;
		}
		this.validationErrors.set([]);

		try {
			await this._usersService.saveCedarPolicy(this.connectionID, this.data.groupId, policy);
			this.dialogRef.close();
		} finally {
			this.submitting.set(false);
		}
	}

	onAddPolicyClick() {
		if (!this.policyList) return;
		this.policyList.showAddForm = true;
		setTimeout(() => {
			const el = this.dialogContent?.nativeElement;
			if (el) {
				el.scrollTop = el.scrollHeight;
			}
		});
	}

	private _parseCedarToPolicyItems(): CedarPolicyItem[] {
		const policy = this.cedarPolicy();
		const parsed = parseCedarPolicy(policy, this.connectionID, this.data.groupId, this.allTables());
		const dashboardItems = parseCedarDashboardItems(policy, this.connectionID);
		return [...permissionsToPolicyItems(parsed), ...dashboardItems];
	}
}
