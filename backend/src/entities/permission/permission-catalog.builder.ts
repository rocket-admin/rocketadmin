import { CEDAR_SCHEMA } from '../cedar-authorization/cedar-schema.js';
import { AvailablePermissionDs } from './application/data-structures/available-permissions.ds.js';

export function buildPermissionCatalog(): Array<AvailablePermissionDs> {
	const schemaActions = (CEDAR_SCHEMA as SchemaShape).RocketAdmin.actions;
	return Object.entries(schemaActions).map(([value, definition]) =>
		buildAction(value, definition.appliesTo.resourceTypes),
	);
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

type SchemaShape = {
	RocketAdmin: {
		actions: Record<string, { appliesTo: { principalTypes: Array<string>; resourceTypes: Array<string> } }>;
	};
};
