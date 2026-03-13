import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CedarPolicyItem, POLICY_ACTIONS } from 'src/app/lib/cedar-policy-items';
import { ContentLoaderComponent } from '../../ui-components/content-loader/content-loader.component';

export interface AvailableTable {
	tableName: string;
	displayName: string;
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
	@Input() policies: CedarPolicyItem[] = [];
	@Input() availableTables: AvailableTable[] = [];
	@Input() loading: boolean = false;
	@Output() policiesChange = new EventEmitter<CedarPolicyItem[]>();

	showAddForm = false;
	newAction = '';
	newTableName = '';

	editingIndex: number | null = null;
	editAction = '';
	editTableName = '';

	availableActions = POLICY_ACTIONS;

	get needsTable(): boolean {
		return this.newAction.startsWith('table:');
	}

	get editNeedsTable(): boolean {
		return this.editAction.startsWith('table:');
	}

	getActionLabel(action: string): string {
		return this.availableActions.find((a) => a.value === action)?.label || action;
	}

	getTableDisplayName(tableName: string): string {
		if (tableName === '*') return 'All tables';
		return this.availableTables.find((t) => t.tableName === tableName)?.displayName || tableName;
	}

	addPolicy() {
		if (!this.newAction) return;
		if (this.needsTable && !this.newTableName) return;

		const item: CedarPolicyItem = { action: this.newAction };
		if (this.needsTable) {
			item.tableName = this.newTableName;
		}
		this.policies = [...this.policies, item];
		this.policiesChange.emit(this.policies);
		this.resetAddForm();
	}

	removePolicy(index: number) {
		this.policies = this.policies.filter((_, i) => i !== index);
		this.policiesChange.emit(this.policies);
	}

	startEdit(index: number) {
		this.editingIndex = index;
		this.editAction = this.policies[index].action;
		this.editTableName = this.policies[index].tableName || '';
	}

	saveEdit(index: number) {
		if (!this.editAction) return;
		if (this.editNeedsTable && !this.editTableName) return;

		const updated = [...this.policies];
		updated[index] = {
			action: this.editAction,
			tableName: this.editNeedsTable ? this.editTableName : undefined,
		};
		this.policies = updated;
		this.policiesChange.emit(this.policies);
		this.editingIndex = null;
	}

	cancelEdit() {
		this.editingIndex = null;
	}

	resetAddForm() {
		this.showAddForm = false;
		this.newAction = '';
		this.newTableName = '';
	}
}
