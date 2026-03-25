import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
	CedarPolicyItem,
	POLICY_ACTION_GROUPS,
	POLICY_ACTIONS,
	PolicyActionGroup,
} from 'src/app/lib/cedar-policy-items';
import { ContentLoaderComponent } from '../../ui-components/content-loader/content-loader.component';

export interface AvailableTable {
	tableName: string;
	displayName: string;
}

export interface AvailableDashboard {
	id: string;
	name: string;
}

export interface PolicyGroup {
	label: string;
	description: string;
	icon: string;
	colorClass: string;
	policies: { item: CedarPolicyItem; originalIndex: number }[];
}

@Component({
	selector: 'app-cedar-policy-list',
	imports: [
		CommonModule,
		FormsModule,
		MatButtonModule,
		MatFormFieldModule,
		MatIconModule,
		MatSelectModule,
		MatTooltipModule,
		ContentLoaderComponent,
	],
	templateUrl: './cedar-policy-list.component.html',
	styleUrls: ['./cedar-policy-list.component.css'],
})
export class CedarPolicyListComponent {
	readonly policies = input<CedarPolicyItem[]>([]);
	readonly availableTables = input<AvailableTable[]>([]);
	readonly availableDashboards = input<AvailableDashboard[]>([]);
	readonly loading = input(false);
	readonly policiesChange = output<CedarPolicyItem[]>();

	// Form state - plain properties for ngModel binding
	showAddForm = false;
	newAction = '';
	newTableName = '';
	newDashboardId = '';

	editingIndex: number | null = null;
	editAction = '';
	editTableName = '';
	editDashboardId = '';

	collapsedGroups = new Set<string>();

	private _availableActions = POLICY_ACTIONS;

	// Computed derived views
	protected groupedPolicies = computed(() => this._computeGroupedPolicies());
	protected addActionGroups = computed(() => this._buildFilteredGroups(-1));

	get needsTable(): boolean {
		return this._availableActions.find((a) => a.value === this.newAction)?.needsTable ?? false;
	}

	get needsDashboard(): boolean {
		return this._availableActions.find((a) => a.value === this.newAction)?.needsDashboard ?? false;
	}

	get editNeedsTable(): boolean {
		return this._availableActions.find((a) => a.value === this.editAction)?.needsTable ?? false;
	}

	get editNeedsDashboard(): boolean {
		return this._availableActions.find((a) => a.value === this.editAction)?.needsDashboard ?? false;
	}

	protected usedTables = computed(() => {
		const map = new Map<string, string[]>();
		for (const p of this.policies()) {
			if (p.tableName) {
				const labels = map.get(p.tableName) || [];
				labels.push(this._shortLabels[p.action] || p.action);
				map.set(p.tableName, labels);
			}
		}
		return map;
	});

	protected usedDashboards = computed(() => {
		const map = new Map<string, string[]>();
		for (const p of this.policies()) {
			if (p.dashboardId) {
				const labels = map.get(p.dashboardId) || [];
				labels.push(this._shortLabels[p.action] || p.action);
				map.set(p.dashboardId, labels);
			}
		}
		return map;
	});

	toggleGroup(label: string) {
		if (this.collapsedGroups.has(label)) {
			this.collapsedGroups.delete(label);
		} else {
			this.collapsedGroups.add(label);
		}
	}

	isCollapsed(label: string): boolean {
		return this.collapsedGroups.has(label);
	}

	getTableUsedHint(tableName: string): string {
		return this.usedTables().get(tableName)?.join(', ') || '';
	}

	getDashboardUsedHint(dashboardId: string): string {
		return this.usedDashboards().get(dashboardId)?.join(', ') || '';
	}

	getActionIcon(action: string): string {
		return this._actionIcons[action] || 'security';
	}

	getShortActionLabel(action: string): string {
		return this._shortLabels[action] || action;
	}

	getActionLabel(action: string): string {
		return this._availableActions.find((a) => a.value === action)?.label || action;
	}

	getTableDisplayName(tableName: string): string {
		if (tableName === '*') return 'All tables';
		return this.availableTables().find((t) => t.tableName === tableName)?.displayName || tableName;
	}

	getDashboardDisplayName(dashboardId: string): string {
		if (dashboardId === '*') return 'All dashboards';
		return this.availableDashboards().find((d) => d.id === dashboardId)?.name || dashboardId;
	}

	hasPendingChanges(): boolean {
		return (this.showAddForm && !!this.newAction) || this.editingIndex !== null;
	}

	discardPending() {
		if (this.showAddForm) this.resetAddForm();
		if (this.editingIndex !== null) this.cancelEdit();
	}

	addPolicy() {
		if (!this.newAction) return;
		if (this.needsTable && !this.newTableName) return;
		if (this.needsDashboard && !this.newDashboardId) return;

		const currentPolicies = this.policies();
		const duplicate = currentPolicies.some((p) => {
			if (p.action !== this.newAction) return false;
			if (this.needsTable) return p.tableName === this.newTableName;
			if (this.needsDashboard) return p.dashboardId === this.newDashboardId;
			return true;
		});
		if (duplicate) return;

		const item: CedarPolicyItem = { action: this.newAction };
		if (this.needsTable) {
			item.tableName = this.newTableName;
		}
		if (this.needsDashboard) {
			item.dashboardId = this.newDashboardId;
		}
		this.policiesChange.emit([...currentPolicies, item]);
		this.resetAddForm();
	}

	removePolicy(index: number) {
		this.policiesChange.emit(this.policies().filter((_, i) => i !== index));
	}

	startEdit(index: number) {
		const p = this.policies()[index];
		this.editingIndex = index;
		this.editAction = p.action;
		this.editTableName = p.tableName || '';
		this.editDashboardId = p.dashboardId || '';
	}

	get editActionGroups(): PolicyActionGroup[] {
		return this._buildFilteredGroups(this.editingIndex ?? -1);
	}

	saveEdit(index: number) {
		if (!this.editAction) return;
		if (this.editNeedsTable && !this.editTableName) return;
		if (this.editNeedsDashboard && !this.editDashboardId) return;

		const updated = [...this.policies()];
		updated[index] = {
			action: this.editAction,
			tableName: this.editNeedsTable ? this.editTableName : undefined,
			dashboardId: this.editNeedsDashboard ? this.editDashboardId : undefined,
		};
		this.policiesChange.emit(updated);
		this.editingIndex = null;
	}

	cancelEdit() {
		this.editingIndex = null;
	}

	resetAddForm() {
		this.showAddForm = false;
		this.newAction = '';
		this.newTableName = '';
		this.newDashboardId = '';
	}

	private _groupConfig = [
		{
			prefix: '*',
			label: 'General',
			description: 'Full access to everything',
			icon: 'admin_panel_settings',
			colorClass: 'general',
		},
		{
			prefix: 'connection:',
			label: 'Connection',
			description: 'Connection settings access',
			icon: 'cable',
			colorClass: 'connection',
		},
		{ prefix: 'group:', label: 'Group', description: 'User group management', icon: 'group', colorClass: 'group' },
		{
			prefix: 'table:',
			label: 'Table',
			description: 'Table data operations',
			icon: 'table_chart',
			colorClass: 'table',
		},
		{
			prefix: 'dashboard:',
			label: 'Dashboard',
			description: 'Dashboard access',
			icon: 'dashboard',
			colorClass: 'dashboard',
		},
	];

	private _actionIcons: Record<string, string> = {
		'*': 'shield',
		'connection:read': 'visibility',
		'connection:edit': 'edit',
		'group:read': 'visibility',
		'group:edit': 'settings',
		'table:*': 'shield',
		'table:read': 'visibility',
		'table:add': 'add_circle',
		'table:edit': 'edit',
		'table:delete': 'delete',
		'dashboard:*': 'shield',
		'dashboard:read': 'visibility',
		'dashboard:create': 'add_circle',
		'dashboard:edit': 'edit',
		'dashboard:delete': 'delete',
	};

	private _shortLabels: Record<string, string> = {
		'*': 'Full access',
		'connection:read': 'Read',
		'connection:edit': 'Full access',
		'group:read': 'Read',
		'group:edit': 'Manage',
		'table:*': 'Full access',
		'table:read': 'Read',
		'table:add': 'Add',
		'table:edit': 'Edit',
		'table:delete': 'Delete',
		'dashboard:*': 'Full access',
		'dashboard:read': 'Read',
		'dashboard:create': 'Create',
		'dashboard:edit': 'Edit',
		'dashboard:delete': 'Delete',
	};

	private _computeGroupedPolicies(): PolicyGroup[] {
		const policies = this.policies();
		return this._groupConfig
			.map((cfg) => ({
				label: cfg.label,
				description: cfg.description,
				icon: cfg.icon,
				colorClass: cfg.colorClass,
				policies: policies
					.map((item, i) => ({ item, originalIndex: i }))
					.filter(({ item }) => (cfg.prefix === '*' ? item.action === '*' : item.action.startsWith(cfg.prefix))),
			}))
			.filter((g) => g.policies.length > 0);
	}

	private _buildFilteredGroups(excludeIndex: number): PolicyActionGroup[] {
		const policies = this.policies();
		const existingSimple = new Set(
			policies
				.filter((p, i) => {
					if (i === excludeIndex) return false;
					const def = this._availableActions.find((a) => a.value === p.action);
					return def && !def.needsTable && !def.needsDashboard;
				})
				.map((p) => p.action),
		);

		return POLICY_ACTION_GROUPS.map((group) => ({
			...group,
			actions: group.actions.filter((action) => {
				if (!action.needsTable && !action.needsDashboard) {
					return !existingSimple.has(action.value);
				}
				return true;
			}),
		})).filter((group) => group.actions.length > 0);
	}
}
