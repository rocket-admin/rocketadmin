// The form-based policy builder's logic (CedarPolicyListComponent's private helpers), kept out of
// the component so it can be tested on plain data.
import type { CedarPolicyItem, PolicyAction, PolicyActionGroup, PolicyActionResource } from '@/lib/cedar-policy-items';

export interface PolicyGroup {
	label: string;
	description: string;
	icon: string;
	colorClass: string;
	policies: { item: CedarPolicyItem; originalIndex: number }[];
}

const WILDCARD_PREFIXES: PolicyActionResource[] = ['table', 'dashboard', 'panel'];

const GROUP_CONFIG = [
	{
		prefix: '*',
		label: 'General',
		description: 'Full access to everything',
		icon: 'admin_panel_settings',
		colorClass: 'general',
	},
	{
		prefix: 'connection:',
		label: 'Connection',
		description: 'Connection settings access',
		icon: 'cable',
		colorClass: 'connection',
	},
	{ prefix: 'group:', label: 'Group', description: 'User group management', icon: 'group', colorClass: 'group' },
	{ prefix: 'table:', label: 'Table', description: 'Table data operations', icon: 'table_chart', colorClass: 'table' },
	{
		prefix: 'actionEvent:',
		label: 'ActionEvent',
		description: 'Custom action event triggers',
		icon: 'play_arrow',
		colorClass: 'action-event',
	},
	{
		prefix: 'dashboard:',
		label: 'Dashboard',
		description: 'Dashboard access',
		icon: 'dashboard',
		colorClass: 'dashboard',
	},
	{ prefix: 'panel:', label: 'Panel', description: 'Panel access', icon: 'view_quilt', colorClass: 'panel' },
];

/** The backend's action groups, with a synthetic General `*` group first and a `prefix:*` wildcard per scoped group. */
export function buildDisplayGroups(available: PolicyActionGroup[]): PolicyActionGroup[] {
	const general: PolicyActionGroup = { group: 'General', actions: [{ value: '*' }] };
	return [general, ...available.map(withWildcardEntry)];
}

/** What an action is scoped to: a table, a dashboard, or nothing (`dashboard:create` is scopeless). */
export function scopeResource(actions: PolicyAction[], value: string): PolicyActionResource | undefined {
	if (value === 'dashboard:create') return undefined;
	return actions.find((action) => action.value === value)?.resource;
}

/**
 * The action picker's groups: actions that need no table or dashboard can be granted once, so those
 * already in the policy (except the one at `excludeIndex`, being edited) are left out.
 */
export function buildFilteredGroups(
	groups: PolicyActionGroup[],
	policies: CedarPolicyItem[],
	excludeIndex: number,
): PolicyActionGroup[] {
	const actions = groups.flatMap((group) => group.actions);
	const existingSimple = new Set(
		policies
			.filter((policy, index) => {
				if (index === excludeIndex) return false;
				const definition = actions.find((action) => action.value === policy.action);
				return definition != null && isSimpleAction(definition);
			})
			.map((policy) => policy.action),
	);

	return groups
		.map((group) => ({
			...group,
			actions: group.actions.filter((action) => !isSimpleAction(action) || !existingSimple.has(action.value)),
		}))
		.filter((group) => group.actions.length > 0);
}

/** The policies bucketed by action prefix, keeping each one's index in the flat list. */
export function groupPolicies(policies: CedarPolicyItem[]): PolicyGroup[] {
	return GROUP_CONFIG.map((config) => ({
		label: config.label,
		description: config.description,
		icon: config.icon,
		colorClass: config.colorClass,
		policies: policies
			.map((item, index) => ({ item, originalIndex: index }))
			.filter(({ item }) => (config.prefix === '*' ? item.action === '*' : item.action.startsWith(config.prefix))),
	})).filter((group) => group.policies.length > 0);
}

function isSimpleAction(action: PolicyAction): boolean {
	if (action.value === 'dashboard:create') return true;
	return action.resource !== 'table' && action.resource !== 'dashboard';
}

function withWildcardEntry(group: PolicyActionGroup): PolicyActionGroup {
	const first = group.actions[0];
	if (!first) return group;
	const prefix = first.value.split(':')[0] as PolicyActionResource;
	if (!WILDCARD_PREFIXES.includes(prefix)) return group;
	const wildcard: PolicyAction = { value: `${prefix}:*`, resource: prefix };
	return { ...group, actions: [wildcard, ...group.actions] };
}
