import { CEDAR_SCHEMA } from '../cedar-authorization/cedar-schema.js';
import {
	AvailablePermissionDs,
	AvailablePermissionGroupDs,
} from './application/data-structures/available-permissions.ds.js';

const PREFIX_TO_GROUP: Record<string, string> = {
	connection: 'Connection',
	group: 'Group',
	table: 'Table',
	actionEvent: 'ActionEvent',
	dashboard: 'Dashboard',
	panel: 'Panel',
};

const GROUP_ORDER = ['Connection', 'Group', 'Table', 'ActionEvent', 'Dashboard', 'Panel'];

export function buildPermissionCatalog(): Array<AvailablePermissionGroupDs> {
	const schemaActions = (CEDAR_SCHEMA as SchemaShape).RocketAdmin.actions;
	const grouped = new Map<string, Array<AvailablePermissionDs>>();

	for (const [value, definition] of Object.entries(schemaActions)) {
		const action = buildAction(value, definition.appliesTo.resourceTypes);
		const groupName = resolveGroupName(value);
		const list = grouped.get(groupName);
		if (list) {
			list.push(action);
		} else {
			grouped.set(groupName, [action]);
		}
	}

	return GROUP_ORDER.filter((name) => grouped.has(name)).map((name) => ({
		group: name,
		actions: grouped.get(name)!,
	}));
}

function buildAction(value: string, resourceTypes: Array<string>): AvailablePermissionDs {
	const action: AvailablePermissionDs = { value };
	const resource = deriveResource(resourceTypes);
	if (resource) {
		action.resource = resource;
	}
	return action;
}

function deriveResource(resourceTypes: Array<string>): string | undefined {
	const first = resourceTypes[0];
	if (!first) return undefined;
	return first.charAt(0).toLowerCase() + first.slice(1);
}

function resolveGroupName(actionValue: string): string {
	const prefix = actionValue.split(':')[0];
	return PREFIX_TO_GROUP[prefix] ?? prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

type SchemaShape = {
	RocketAdmin: {
		actions: Record<string, { appliesTo: { principalTypes: Array<string>; resourceTypes: Array<string> } }>;
	};
};
