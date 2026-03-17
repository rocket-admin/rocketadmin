import { AccessLevel, Permissions, TablePermission } from '../models/user';
import { CedarPolicyItem } from './cedar-policy-items';

interface ParsedPermitStatement {
	action: string | null;
	resourceType: string | null;
	resourceId: string | null;
	isWildcard: boolean;
}

export function parseCedarPolicy(
	policyText: string,
	connectionId: string,
	groupId: string,
	availableTables: TablePermission[],
): Permissions {
	const permits = extractPermitStatements(policyText);

	const result: Permissions = {
		connection: { connectionId, accessLevel: AccessLevel.None },
		group: { groupId, accessLevel: AccessLevel.None },
		tables: [],
	};

	const tableMap = new Map<string, TablePermission>();
	let isFullAccess = false;

	for (const permit of permits) {
		if (permit.isWildcard) {
			result.connection.accessLevel = AccessLevel.Edit;
			result.group.accessLevel = AccessLevel.Edit;
			isFullAccess = true;
			continue;
		}

		if (!permit.action) continue;

		switch (permit.action) {
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
				const tableName = extractResourceSuffix(permit.resourceId, connectionId);
				if (!tableName) break;
				const tableEntry = getOrCreateTableEntry(tableMap, tableName);
				applyTableAction(tableEntry, permit.action);
				break;
			}
			case 'dashboard:read':
			case 'dashboard:create':
			case 'dashboard:edit':
			case 'dashboard:delete':
				break;
		}
	}

	// Apply wildcard table permissions to all tables
	const wildcardEntry = tableMap.get('*');

	// Merge parsed results with full table list
	result.tables = availableTables.map((table) => {
		if (isFullAccess) {
			return {
				...table,
				accessLevel: {
					visibility: true,
					readonly: false,
					add: true,
					delete: true,
					edit: true,
				},
			};
		}
		const base = {
			visibility: false,
			readonly: false,
			add: false,
			delete: false,
			edit: false,
		};
		if (wildcardEntry) {
			base.visibility = base.visibility || wildcardEntry.accessLevel.visibility;
			base.readonly = base.readonly || wildcardEntry.accessLevel.readonly;
			base.add = base.add || wildcardEntry.accessLevel.add;
			base.edit = base.edit || wildcardEntry.accessLevel.edit;
			base.delete = base.delete || wildcardEntry.accessLevel.delete;
		}
		const parsed = tableMap.get(table.tableName);
		if (parsed) {
			base.visibility = base.visibility || parsed.accessLevel.visibility;
			base.readonly = base.readonly || parsed.accessLevel.readonly;
			base.add = base.add || parsed.accessLevel.add;
			base.edit = base.edit || parsed.accessLevel.edit;
			base.delete = base.delete || parsed.accessLevel.delete;
		}
		return {
			...table,
			accessLevel: base,
		};
	});

	return result;
}

export function parseCedarDashboardItems(policyText: string, connectionId: string): CedarPolicyItem[] {
	const permits = extractPermitStatements(policyText);
	const items: CedarPolicyItem[] = [];

	for (const permit of permits) {
		if (!permit.action || !permit.action.startsWith('dashboard:')) continue;
		const dashboardId = extractResourceSuffix(permit.resourceId, connectionId);
		if (dashboardId) {
			items.push({ action: permit.action, dashboardId });
		}
	}

	return items;
}

function extractPermitStatements(policyText: string): ParsedPermitStatement[] {
	const results: ParsedPermitStatement[] = [];
	const permitKeyword = 'permit';
	let searchFrom = 0;

	while (searchFrom < policyText.length) {
		const permitIndex = policyText.indexOf(permitKeyword, searchFrom);
		if (permitIndex === -1) break;

		let i = permitIndex + permitKeyword.length;
		while (
			i < policyText.length &&
			(policyText[i] === ' ' || policyText[i] === '\t' || policyText[i] === '\n' || policyText[i] === '\r')
		) {
			i++;
		}

		if (i >= policyText.length || policyText[i] !== '(') {
			searchFrom = i;
			continue;
		}

		let depth = 1;
		const bodyStart = i + 1;
		i++;
		while (i < policyText.length && depth > 0) {
			if (policyText[i] === '(') depth++;
			else if (policyText[i] === ')') depth--;
			if (depth > 0) i++;
		}

		if (depth !== 0) {
			searchFrom = bodyStart;
			continue;
		}

		const body = policyText.slice(bodyStart, i);
		let j = i + 1;
		while (
			j < policyText.length &&
			(policyText[j] === ' ' || policyText[j] === '\t' || policyText[j] === '\n' || policyText[j] === '\r')
		) {
			j++;
		}

		if (j < policyText.length && policyText[j] === ';') {
			results.push(parsePermitBody(body));
			searchFrom = j + 1;
		} else {
			searchFrom = i + 1;
		}
	}

	return results;
}

function parsePermitBody(body: string): ParsedPermitStatement {
	const result: ParsedPermitStatement = {
		action: null,
		resourceType: null,
		resourceId: null,
		isWildcard: false,
	};

	const actionMatch = body.match(/action\s*(?:==|like)\s*RocketAdmin::Action::"([^"]+)"/);
	if (actionMatch) {
		result.action = actionMatch[1];
	} else {
		const actionClause = body.match(/,\s*(action)\s*,/);
		if (actionClause) {
			result.isWildcard = true;
		}
	}

	const resourceMatch = body.match(/resource\s*(?:==|like)\s*(RocketAdmin::\w+)::"([^"]+)"/);
	if (resourceMatch) {
		result.resourceType = resourceMatch[1];
		result.resourceId = resourceMatch[2];
	} else {
		const resourceClause = body.match(/,\s*(resource)\s*$/m);
		if (resourceClause && !result.action) {
			result.isWildcard = true;
		}
	}

	return result;
}

function extractResourceSuffix(resourceId: string | null, connectionId: string): string | null {
	if (!resourceId) return null;
	const prefix = `${connectionId}/`;
	if (resourceId.startsWith(prefix)) {
		return resourceId.slice(prefix.length);
	}
	return resourceId;
}

function getOrCreateTableEntry(map: Map<string, TablePermission>, tableName: string): TablePermission {
	let entry = map.get(tableName);
	if (!entry) {
		entry = {
			tableName,
			display_name: tableName,
			accessLevel: {
				visibility: false,
				readonly: false,
				add: false,
				delete: false,
				edit: false,
			},
		};
		map.set(tableName, entry);
	}
	return entry;
}

function applyTableAction(entry: TablePermission, action: string): void {
	switch (action) {
		case 'table:*':
			entry.accessLevel.visibility = true;
			entry.accessLevel.readonly = true;
			entry.accessLevel.add = true;
			entry.accessLevel.edit = true;
			entry.accessLevel.delete = true;
			break;
		case 'table:read':
			entry.accessLevel.visibility = true;
			entry.accessLevel.readonly = true;
			break;
		case 'table:add':
			entry.accessLevel.add = true;
			break;
		case 'table:edit':
			entry.accessLevel.edit = true;
			break;
		case 'table:delete':
			entry.accessLevel.delete = true;
			break;
	}
}
