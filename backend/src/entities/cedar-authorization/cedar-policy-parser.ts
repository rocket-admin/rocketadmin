import { AccessLevelEnum } from '../../enums/index.js';
import {
	IComplexPermission,
	IDashboardPermissionData,
	IPanelPermissionData,
	ITablePermissionData,
} from '../permission/permission.interface.js';

interface ParsedPermitStatement {
	action: string | null;
	resourceType: string | null;
	resourceId: string | null;
	isWildcard: boolean;
}

export function parseCedarPolicyToClassicalPermissions(
	policyText: string,
	connectionId: string,
	groupId: string,
): IComplexPermission {
	const permits = extractPermitStatements(policyText);

	const result: IComplexPermission = {
		connection: { connectionId, accessLevel: AccessLevelEnum.none },
		group: { groupId, accessLevel: AccessLevelEnum.none },
		tables: [],
		dashboards: [],
		panels: [],
	};

	const tableMap = new Map<string, ITablePermissionData>();
	const dashboardMap = new Map<string, IDashboardPermissionData>();
	const panelMap = new Map<string, IPanelPermissionData>();

	for (const permit of permits) {
		if (permit.isWildcard) {
			result.connection.accessLevel = AccessLevelEnum.edit;
			result.group.accessLevel = AccessLevelEnum.edit;
			continue;
		}

		if (!permit.action) continue;

		switch (permit.action) {
			case 'connection:read':
				if (result.connection.accessLevel === AccessLevelEnum.none) {
					result.connection.accessLevel = AccessLevelEnum.readonly;
				}
				break;
			case 'connection:edit':
				result.connection.accessLevel = AccessLevelEnum.edit;
				break;
			case 'group:read':
				if (result.group.accessLevel === AccessLevelEnum.none) {
					result.group.accessLevel = AccessLevelEnum.readonly;
				}
				break;
			case 'group:edit':
				result.group.accessLevel = AccessLevelEnum.edit;
				break;
			case 'table:read':
			case 'table:add':
			case 'table:edit':
			case 'table:delete': {
				const tableName = extractTableName(permit.resourceId, connectionId);
				if (!tableName) break;
				const tableEntry = getOrCreateTableEntry(tableMap, tableName);
				applyTableAction(tableEntry, permit.action);
				break;
			}
			case 'dashboard:read':
			case 'dashboard:create':
			case 'dashboard:edit':
			case 'dashboard:delete': {
				const dashboardId = extractDashboardId(permit.resourceId, connectionId);
				if (!dashboardId) break;
				const dashboardEntry = getOrCreateDashboardEntry(dashboardMap, dashboardId);
				applyDashboardAction(dashboardEntry, permit.action);
				break;
			}
			case 'panel:read':
			case 'panel:create':
			case 'panel:edit':
			case 'panel:delete': {
				const panelId = extractPanelId(permit.resourceId, connectionId);
				if (!panelId) break;
				const panelEntry = getOrCreatePanelEntry(panelMap, panelId);
				applyPanelAction(panelEntry, permit.action);
				break;
			}
		}
	}

	result.tables = Array.from(tableMap.values());
	for (const table of result.tables) {
		const a = table.accessLevel;
		a.readonly = a.visibility && !a.add && !a.edit && !a.delete;
	}
	result.dashboards = Array.from(dashboardMap.values());
	result.panels = Array.from(panelMap.values());

	return result;
}

function extractPermitStatements(policyText: string): ParsedPermitStatement[] {
	const results: ParsedPermitStatement[] = [];
	const permitKeyword = 'permit';
	let searchFrom = 0;

	while (searchFrom < policyText.length) {
		const permitIndex = policyText.indexOf(permitKeyword, searchFrom);
		if (permitIndex === -1) break;

		let i = permitIndex + permitKeyword.length;
		// Skip whitespace after "permit"
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

		// Find matching closing parenthesis (handle nesting)
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
		// Skip past ')' and optional whitespace, expect ';'
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

	const actionMatch = body.match(/action\s*==\s*RocketAdmin::Action::"([^"]+)"/);
	if (actionMatch) {
		result.action = actionMatch[1];
	} else {
		const actionClause = body.match(/,\s*(action)\s*,/);
		if (actionClause) {
			result.isWildcard = true;
		}
	}

	const resourceMatch = body.match(/resource\s*==\s*(RocketAdmin::\w+)::"([^"]+)"/);
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

function extractTableName(resourceId: string | null, connectionId: string): string | null {
	if (!resourceId) return null;
	const prefix = `${connectionId}/`;
	if (resourceId.startsWith(prefix)) {
		return resourceId.slice(prefix.length);
	}
	return resourceId;
}

function extractDashboardId(resourceId: string | null, connectionId: string): string | null {
	if (!resourceId) return null;
	const prefix = `${connectionId}/`;
	if (resourceId.startsWith(prefix)) {
		return resourceId.slice(prefix.length);
	}
	return resourceId;
}

function getOrCreateTableEntry(map: Map<string, ITablePermissionData>, tableName: string): ITablePermissionData {
	let entry = map.get(tableName);
	if (!entry) {
		entry = {
			tableName,
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

function applyTableAction(entry: ITablePermissionData, action: string): void {
	switch (action) {
		case 'table:read':
			entry.accessLevel.visibility = true;
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

function getOrCreateDashboardEntry(
	map: Map<string, IDashboardPermissionData>,
	dashboardId: string,
): IDashboardPermissionData {
	let entry = map.get(dashboardId);
	if (!entry) {
		entry = {
			dashboardId,
			accessLevel: {
				read: false,
				create: false,
				edit: false,
				delete: false,
			},
		};
		map.set(dashboardId, entry);
	}
	return entry;
}

function applyDashboardAction(entry: IDashboardPermissionData, action: string): void {
	switch (action) {
		case 'dashboard:read':
			entry.accessLevel.read = true;
			break;
		case 'dashboard:create':
			entry.accessLevel.create = true;
			break;
		case 'dashboard:edit':
			entry.accessLevel.edit = true;
			break;
		case 'dashboard:delete':
			entry.accessLevel.delete = true;
			break;
	}
}

function extractPanelId(resourceId: string | null, connectionId: string): string | null {
	if (!resourceId) return null;
	const prefix = `${connectionId}/`;
	if (resourceId.startsWith(prefix)) {
		return resourceId.slice(prefix.length);
	}
	return resourceId;
}

function getOrCreatePanelEntry(
	map: Map<string, IPanelPermissionData>,
	panelId: string,
): IPanelPermissionData {
	let entry = map.get(panelId);
	if (!entry) {
		entry = {
			panelId,
			accessLevel: {
				read: false,
				create: false,
				edit: false,
				delete: false,
			},
		};
		map.set(panelId, entry);
	}
	return entry;
}

function applyPanelAction(entry: IPanelPermissionData, action: string): void {
	switch (action) {
		case 'panel:read':
			entry.accessLevel.read = true;
			break;
		case 'panel:create':
			entry.accessLevel.create = true;
			break;
		case 'panel:edit':
			entry.accessLevel.edit = true;
			break;
		case 'panel:delete':
			entry.accessLevel.delete = true;
			break;
	}
}
