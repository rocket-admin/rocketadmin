import { AccessLevel, Permissions } from '../models/user';

export interface CedarPolicyItem {
	action: string;
	tableName?: string;
	dashboardId?: string;
}

export interface PolicyAction {
	value: string;
	label: string;
	needsTable: boolean;
	needsDashboard: boolean;
}

export interface PolicyActionGroup {
	group: string;
	actions: PolicyAction[];
}

export const POLICY_ACTION_GROUPS: PolicyActionGroup[] = [
	{
		group: 'General',
		actions: [{ value: '*', label: 'Full access (all permissions)', needsTable: false, needsDashboard: false }],
	},
	{
		group: 'Connection',
		actions: [
			{ value: 'connection:read', label: 'Connection read', needsTable: false, needsDashboard: false },
			{ value: 'connection:edit', label: 'Connection full access', needsTable: false, needsDashboard: false },
		],
	},
	{
		group: 'Group',
		actions: [
			{ value: 'group:read', label: 'Group read', needsTable: false, needsDashboard: false },
			{ value: 'group:edit', label: 'Group manage', needsTable: false, needsDashboard: false },
		],
	},
	{
		group: 'Table',
		actions: [
			{ value: 'table:*', label: 'Full table access', needsTable: true, needsDashboard: false },
			{ value: 'table:read', label: 'Table read', needsTable: true, needsDashboard: false },
			{ value: 'table:add', label: 'Table add', needsTable: true, needsDashboard: false },
			{ value: 'table:edit', label: 'Table edit', needsTable: true, needsDashboard: false },
			{ value: 'table:delete', label: 'Table delete', needsTable: true, needsDashboard: false },
		],
	},
	{
		group: 'Dashboard',
		actions: [
			{ value: 'dashboard:*', label: 'Full dashboard access', needsTable: false, needsDashboard: true },
			{ value: 'dashboard:read', label: 'Dashboard read', needsTable: false, needsDashboard: true },
			{ value: 'dashboard:create', label: 'Dashboard create', needsTable: false, needsDashboard: true },
			{ value: 'dashboard:edit', label: 'Dashboard edit', needsTable: false, needsDashboard: true },
			{ value: 'dashboard:delete', label: 'Dashboard delete', needsTable: false, needsDashboard: true },
		],
	},
];

export const POLICY_ACTIONS: PolicyAction[] = POLICY_ACTION_GROUPS.flatMap((g) => g.actions);

export function permissionsToPolicyItems(permissions: Permissions): CedarPolicyItem[] {
	const items: CedarPolicyItem[] = [];

	const connAccess = permissions.connection.accessLevel;
	if (connAccess === AccessLevel.Edit) {
		items.push({ action: '*' });
		return items;
	}
	if (connAccess === AccessLevel.Readonly) {
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

		const actionRef =
			item.action === 'table:*' || item.action === 'dashboard:*'
				? `action like RocketAdmin::Action::"${item.action}"`
				: `action == RocketAdmin::Action::"${item.action}"`;
		let resource: string;

		if (item.action.startsWith('table:')) {
			resource = buildResourceRef('Table', connectionId, item.tableName);
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

function buildResourceRef(type: string, connectionId: string, id: string | undefined): string {
	if (id === '*') {
		return `resource like RocketAdmin::${type}::"${connectionId}/*"`;
	}
	return `resource == RocketAdmin::${type}::"${connectionId}/${id}"`;
}
