import { AccessLevel, Permissions, TablePermission } from '../models/user';

export interface CedarPolicyItem {
	action: string;
	tableName?: string;
}

export const POLICY_ACTIONS = [
	{ value: '*', label: 'Full access (all permissions)', needsTable: false },
	{ value: 'connection:read', label: 'Connection: Read', needsTable: false },
	{ value: 'connection:edit', label: 'Connection: Full access', needsTable: false },
	{ value: 'group:read', label: 'Group: Read', needsTable: false },
	{ value: 'group:edit', label: 'Group: Manage', needsTable: false },
	{ value: 'table:read', label: 'Table: Read', needsTable: true },
	{ value: 'table:add', label: 'Table: Add', needsTable: true },
	{ value: 'table:edit', label: 'Table: Edit', needsTable: true },
	{ value: 'table:delete', label: 'Table: Delete', needsTable: true },
];

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

	for (const table of permissions.tables) {
		const access = table.accessLevel;
		if (access.visibility) items.push({ action: 'table:read', tableName: table.tableName });
		if (access.add) items.push({ action: 'table:add', tableName: table.tableName });
		if (access.edit) items.push({ action: 'table:edit', tableName: table.tableName });
		if (access.delete) items.push({ action: 'table:delete', tableName: table.tableName });
	}

	return items;
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
			case 'table:read':
			case 'table:add':
			case 'table:edit':
			case 'table:delete': {
				if (!item.tableName) break;
				const table = result.tables.find((t) => t.tableName === item.tableName);
				if (table) {
					table.accessLevel.visibility = true;
					switch (item.action) {
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
