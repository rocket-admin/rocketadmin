import { CEDAR_SCHEMA } from '../cedar-authorization/cedar-schema.js';
import {
	AvailablePermissionDs,
	AvailablePermissionGroupDs,
} from './application/data-structures/available-permissions.ds.js';

type ActionMetadataOverride = {
	label?: string;
	shortLabel?: string;
	icon?: string;
	resourceOverride?: 'none' | string;
};

const NONE_RESOURCE_OVERRIDE = 'none';

// Resources for which the UI knows how to render a per-instance picker.
// Actions scoped to a resource not in this set will be exposed without `resource`,
// so they still appear in the list but without a sub-scope selector.
const UI_RENDERABLE_RESOURCES = new Set(['table', 'dashboard']);

const ACTION_DISPLAY_METADATA: Record<string, ActionMetadataOverride> = {
	'connection:read': { shortLabel: 'Read', icon: 'visibility' },
	'connection:edit': { label: 'Connection full access', shortLabel: 'Full access', icon: 'edit' },
	'connection:diagram': { shortLabel: 'Diagram', icon: 'schema' },
	'group:read': { shortLabel: 'Read', icon: 'visibility' },
	'group:edit': { label: 'Group manage', shortLabel: 'Manage', icon: 'settings' },
	'table:read': { shortLabel: 'Read', icon: 'visibility' },
	'table:add': { shortLabel: 'Add', icon: 'add_circle' },
	'table:edit': { shortLabel: 'Edit', icon: 'edit' },
	'table:delete': { shortLabel: 'Delete', icon: 'delete' },
	'table:ai-request': { label: 'Table AI request', shortLabel: 'AI request', icon: 'auto_awesome' },
	'actionEvent:trigger': { label: 'Action event trigger', shortLabel: 'Trigger', icon: 'play_arrow' },
	'dashboard:read': { shortLabel: 'Read', icon: 'visibility' },
	'dashboard:create': { shortLabel: 'Create', icon: 'add_circle', resourceOverride: NONE_RESOURCE_OVERRIDE },
	'dashboard:edit': { shortLabel: 'Edit', icon: 'edit' },
	'dashboard:delete': { shortLabel: 'Delete', icon: 'delete' },
	'panel:read': { shortLabel: 'Read', icon: 'visibility' },
	'panel:create': { shortLabel: 'Create', icon: 'add_circle' },
	'panel:edit': { shortLabel: 'Edit', icon: 'edit' },
	'panel:delete': { shortLabel: 'Delete', icon: 'delete' },
};

const PREFIX_TO_GROUP: Record<string, string> = {
	connection: 'Connection',
	group: 'Group',
	table: 'Table',
	actionEvent: 'ActionEvent',
	dashboard: 'Dashboard',
	panel: 'Panel',
};

const GROUP_ORDER = ['General', 'Connection', 'Group', 'Table', 'ActionEvent', 'Dashboard', 'Panel'];

const WILDCARD_GROUPS = new Set(['Table', 'Dashboard', 'Panel']);

const WILDCARD_LABELS: Record<string, { label: string; shortLabel: string }> = {
	Table: { label: 'Full table access', shortLabel: 'Full access' },
	Dashboard: { label: 'Full dashboard access', shortLabel: 'Full access' },
	Panel: { label: 'Full panel access', shortLabel: 'Full access' },
};

export function buildPermissionCatalog(): Array<AvailablePermissionGroupDs> {
	const schemaActions = (CEDAR_SCHEMA as SchemaShape).RocketAdmin.actions;
	const grouped = new Map<string, Array<AvailablePermissionDs>>();

	for (const [value, definition] of Object.entries(schemaActions)) {
		const action = buildAction(value, definition.appliesTo.resourceTypes);
		const groupName = resolveGroupName(value);
		appendAction(grouped, groupName, action);
	}

	appendAction(grouped, 'General', buildWildcardAllAction());

	for (const groupName of WILDCARD_GROUPS) {
		const actions = grouped.get(groupName);
		if (actions && actions.length > 1) {
			const prefix = groupName.toLowerCase();
			const resource = actions.find((a) => a.resource)?.resource;
			actions.unshift(buildPrefixWildcard(prefix, groupName, resource));
		}
	}

	return GROUP_ORDER.filter((name) => grouped.has(name)).map((name) => ({
		group: name,
		actions: grouped.get(name)!,
	}));
}

function appendAction(
	target: Map<string, Array<AvailablePermissionDs>>,
	groupName: string,
	action: AvailablePermissionDs,
): void {
	const list = target.get(groupName);
	if (list) {
		list.push(action);
	} else {
		target.set(groupName, [action]);
	}
}

function buildAction(value: string, resourceTypes: Array<string>): AvailablePermissionDs {
	const meta = ACTION_DISPLAY_METADATA[value] ?? {};
	const derivedResource = deriveResource(resourceTypes);
	const resource =
		meta.resourceOverride === NONE_RESOURCE_OVERRIDE ? undefined : (meta.resourceOverride ?? derivedResource);

	const action: AvailablePermissionDs = {
		value,
		label: meta.label ?? autoLabel(value),
		shortLabel: meta.shortLabel ?? autoShortLabel(value),
		icon: meta.icon ?? 'help_outline',
	};
	if (resource) {
		action.resource = resource;
	}
	return action;
}

function buildWildcardAllAction(): AvailablePermissionDs {
	return {
		value: '*',
		label: 'Full access (all permissions)',
		shortLabel: 'Full access',
		icon: 'shield',
	};
}

function buildPrefixWildcard(prefix: string, groupName: string, resource: string | undefined): AvailablePermissionDs {
	const labels = WILDCARD_LABELS[groupName] ?? { label: `Full ${prefix} access`, shortLabel: 'Full access' };
	const action: AvailablePermissionDs = {
		value: `${prefix}:*`,
		label: labels.label,
		shortLabel: labels.shortLabel,
		icon: 'shield',
	};
	if (resource) {
		action.resource = resource;
	}
	return action;
}

function deriveResource(resourceTypes: Array<string>): string | undefined {
	for (const type of resourceTypes) {
		const candidate = type.charAt(0).toLowerCase() + type.slice(1);
		if (UI_RENDERABLE_RESOURCES.has(candidate)) {
			return candidate;
		}
	}
	return undefined;
}

function resolveGroupName(actionValue: string): string {
	const [prefix] = actionValue.split(':');
	return PREFIX_TO_GROUP[prefix] ?? capitalize(prefix);
}

function autoLabel(value: string): string {
	const [prefix, verb = ''] = value.split(':');
	const groupName = PREFIX_TO_GROUP[prefix] ?? capitalize(prefix);
	const verbWords = verb.split('-').map(capitalize).join(' ');
	return verbWords ? `${groupName} ${verbWords.toLowerCase()}` : groupName;
}

function autoShortLabel(value: string): string {
	const verb = value.split(':')[1] ?? value;
	return verb
		.split('-')
		.map((part, index) => (index === 0 ? capitalize(part) : part))
		.join(' ');
}

function capitalize(text: string): string {
	return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

type SchemaShape = {
	RocketAdmin: {
		actions: Record<string, { appliesTo: { principalTypes: Array<string>; resourceTypes: Array<string> } }>;
	};
};
