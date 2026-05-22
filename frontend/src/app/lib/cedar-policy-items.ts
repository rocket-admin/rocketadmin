import { AccessLevel, Permissions } from '../models/user';

export type PolicyActionResource = 'table' | 'dashboard' | 'panel' | 'actionEvent';

export interface CedarPolicyItem {
	action: string;
	tableName?: string;
	dashboardId?: string;
}

export interface PolicyAction {
	value: string;
	label: string;
	shortLabel: string;
	icon: string;
	resource?: PolicyActionResource;
}

export interface PolicyActionGroup {
	group: string;
	actions: PolicyAction[];
}

export function permissionsToPolicyItems(permissions: Permissions): CedarPolicyItem[] {
	const items: CedarPolicyItem[] = [];

	const connAccess = permissions.connection.accessLevel;
	if (connAccess === AccessLevel.Edit) {
		items.push({ action: 'connection:read' });
		items.push({ action: 'connection:edit' });
	} else if (connAccess === AccessLevel.Readonly) {
		items.push({ action: 'connection:read' });
	}

	const groupAccess = permissions.group.accessLevel;
	if (groupAccess === AccessLevel.Edit) {
		items.push({ action: 'group:read' });
		items.push({ action: 'group:edit' });
	} else if (groupAccess === AccessLevel.Readonly) {
		items.push({ action: 'group:read' });
	}

	// Check if all tables share the same permissions — collapse to wildcard '*'
	const tables = permissions.tables;
	if (tables.length > 0) {
		const allRead = tables.every((t) => t.accessLevel.visibility);
		const allAdd = tables.every((t) => t.accessLevel.add);
		const allEdit = tables.every((t) => t.accessLevel.edit);
		const allDelete = tables.every((t) => t.accessLevel.delete);
		const anyTableAccess = allRead || allAdd || allEdit || allDelete;

		if (anyTableAccess && allRead && allAdd && allEdit && allDelete) {
			items.push({ action: 'table:*', tableName: '*' });
		} else if (anyTableAccess && (allRead || allAdd || allEdit || allDelete)) {
			// Some actions apply to all tables, others are per-table
			if (allRead) items.push({ action: 'table:read', tableName: '*' });
			if (allAdd) items.push({ action: 'table:add', tableName: '*' });
			if (allEdit) items.push({ action: 'table:edit', tableName: '*' });
			if (allDelete) items.push({ action: 'table:delete', tableName: '*' });
			for (const table of tables) {
				const access = table.accessLevel;
				if (!allRead && access.visibility) items.push({ action: 'table:read', tableName: table.tableName });
				if (!allAdd && access.add) items.push({ action: 'table:add', tableName: table.tableName });
				if (!allEdit && access.edit) items.push({ action: 'table:edit', tableName: table.tableName });
				if (!allDelete && access.delete) items.push({ action: 'table:delete', tableName: table.tableName });
			}
		} else {
			for (const table of tables) {
				const access = table.accessLevel;
				if (access.visibility && access.add && access.edit && access.delete) {
					items.push({ action: 'table:*', tableName: table.tableName });
				} else {
					if (access.visibility) items.push({ action: 'table:read', tableName: table.tableName });
					if (access.add) items.push({ action: 'table:add', tableName: table.tableName });
					if (access.edit) items.push({ action: 'table:edit', tableName: table.tableName });
					if (access.delete) items.push({ action: 'table:delete', tableName: table.tableName });
				}
			}
		}
	}

	return items;
}

export function policyItemsToCedarPolicy(items: CedarPolicyItem[], connectionId: string, groupId: string): string {
	const policies: string[] = [];

	for (const item of items) {
		if (item.action === '*') {
			policies.push('permit(\n  principal,\n  action,\n  resource\n);');
			return policies.join('\n\n');
		}

		const actionRef = buildActionRef(item.action);
		let resource: string;

		if (item.action.startsWith('table:')) {
			resource = buildResourceRef('Table', connectionId, item.tableName);
		} else if (item.action === 'dashboard:create') {
			resource = `resource == RocketAdmin::Connection::"${connectionId}"`;
		} else if (item.action.startsWith('dashboard:')) {
			resource = buildResourceRef('Dashboard', connectionId, item.dashboardId);
		} else if (item.action.startsWith('group:')) {
			resource = `resource == RocketAdmin::Group::"${groupId}"`;
		} else {
			resource = `resource == RocketAdmin::Connection::"${connectionId}"`;
		}

		policies.push(`permit(\n  principal,\n  ${actionRef},\n  ${resource}\n);`);
	}

	return policies.join('\n\n');
}

const TABLE_ACTIONS = ['table:read', 'table:add', 'table:edit', 'table:delete'];
const DASHBOARD_ACTIONS = ['dashboard:read', 'dashboard:create', 'dashboard:edit', 'dashboard:delete'];

function buildActionRef(action: string): string {
	if (action === 'table:*') {
		const list = TABLE_ACTIONS.map((a) => `RocketAdmin::Action::"${a}"`).join(', ');
		return `action in [${list}]`;
	}
	if (action === 'dashboard:*') {
		const list = DASHBOARD_ACTIONS.map((a) => `RocketAdmin::Action::"${a}"`).join(', ');
		return `action in [${list}]`;
	}
	return `action == RocketAdmin::Action::"${action}"`;
}

function buildResourceRef(type: string, connectionId: string, id: string | undefined): string {
	if (id === '*') {
		return `resource`;
	}
	return `resource == RocketAdmin::${type}::"${connectionId}/${id}"`;
}
