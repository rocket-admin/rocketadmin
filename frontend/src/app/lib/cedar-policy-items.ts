import { AccessLevel, Permissions, TablePermission } from '../models/user';

export interface CedarPolicyItem {
	action: string;
	tableName?: string;
}

export interface PolicyAction {
	value: string;
	label: string;
	needsTable: boolean;
}

export interface PolicyActionGroup {
	group: string;
	actions: PolicyAction[];
}

export const POLICY_ACTION_GROUPS: PolicyActionGroup[] = [
	{
		group: 'General',
		actions: [{ value: '*', label: 'Full access (all permissions)', needsTable: false }],
	},
	{
		group: 'Connection',
		actions: [
			{ value: 'connection:read', label: 'Connection read', needsTable: false },
			{ value: 'connection:edit', label: 'Connection full access', needsTable: false },
		],
	},
	{
		group: 'Group',
		actions: [
			{ value: 'group:read', label: 'Group read', needsTable: false },
			{ value: 'group:edit', label: 'Group manage', needsTable: false },
		],
	},
	{
		group: 'Table',
		actions: [
			{ value: 'table:*', label: 'Full table access', needsTable: true },
			{ value: 'table:read', label: 'Table read', needsTable: true },
			{ value: 'table:add', label: 'Table add', needsTable: true },
			{ value: 'table:edit', label: 'Table edit', needsTable: true },
			{ value: 'table:delete', label: 'Table delete', needsTable: true },
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
			item.action === 'table:*'
				? `action like RocketAdmin::Action::"table:*"`
				: `action == RocketAdmin::Action::"${item.action}"`;
		let resource: string;

		if (item.action.startsWith('table:')) {
			if (item.tableName === '*') {
				resource = `resource like RocketAdmin::Table::"${connectionId}/*"`;
			} else {
				resource = `resource == RocketAdmin::Table::"${connectionId}/${item.tableName}"`;
			}
		} else if (item.action.startsWith('group:')) {
			resource = `resource == RocketAdmin::Group::"${groupId}"`;
		} else {
			resource = `resource == RocketAdmin::Connection::"${connectionId}"`;
		}

		policies.push(`permit(\n  principal,\n  ${actionRef},\n  ${resource}\n);`);
	}

	return policies.join('\n\n');
}

export function policyItemsToPermissions(
	items: CedarPolicyItem[],
	connectionId: string,
	groupId: string,
	availableTables: TablePermission[],
): Permissions {
	const result: Permissions = {
		connection: { connectionId, accessLevel: AccessLevel.None },
		group: { groupId, accessLevel: AccessLevel.None },
		tables: availableTables.map((t) => ({
			...t,
			accessLevel: { visibility: false, readonly: false, add: false, delete: false, edit: false },
		})),
	};

	for (const item of items) {
		if (item.action === '*') {
			result.connection.accessLevel = AccessLevel.Edit;
			result.group.accessLevel = AccessLevel.Edit;
			result.tables.forEach((t) => {
				t.accessLevel = { visibility: true, readonly: false, add: true, delete: true, edit: true };
			});
			return result;
		}

		switch (item.action) {
			case 'connection:read':
				if (result.connection.accessLevel === AccessLevel.None) {
					result.connection.accessLevel = AccessLevel.Readonly;
				}
				break;
			case 'connection:edit':
				result.connection.accessLevel = AccessLevel.Edit;
				break;
			case 'group:read':
				if (result.group.accessLevel === AccessLevel.None) {
					result.group.accessLevel = AccessLevel.Readonly;
				}
				break;
			case 'group:edit':
				result.group.accessLevel = AccessLevel.Edit;
				break;
			case 'table:*':
			case 'table:read':
			case 'table:add':
			case 'table:edit':
			case 'table:delete': {
				if (!item.tableName) break;
				const targets =
					item.tableName === '*' ? result.tables : result.tables.filter((t) => t.tableName === item.tableName);
				for (const table of targets) {
					table.accessLevel.visibility = true;
					switch (item.action) {
						case 'table:*':
							table.accessLevel.readonly = true;
							table.accessLevel.add = true;
							table.accessLevel.edit = true;
							table.accessLevel.delete = true;
							break;
						case 'table:read':
							table.accessLevel.readonly = true;
							break;
						case 'table:add':
							table.accessLevel.add = true;
							break;
						case 'table:edit':
							table.accessLevel.edit = true;
							break;
						case 'table:delete':
							table.accessLevel.delete = true;
							break;
					}
				}
				break;
			}
		}
	}

	return result;
}
