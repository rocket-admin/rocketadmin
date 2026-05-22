const PREFIX_TO_LABEL: Record<string, string> = {
	connection: 'Connection',
	group: 'Group',
	table: 'Table',
	actionEvent: 'Action event',
	dashboard: 'Dashboard',
	panel: 'Panel',
};

const VERB_TO_ICON: Record<string, string> = {
	read: 'visibility',
	edit: 'edit',
	add: 'add_circle',
	create: 'add_circle',
	delete: 'delete',
	trigger: 'play_arrow',
	diagram: 'schema',
	'ai-request': 'auto_awesome',
};

// Verb display overrides used inside labels (lowercase context).
// e.g. `actionLabel('table:ai-request')` → 'Table AI request'.
const VERB_DISPLAY_OVERRIDE: Record<string, string> = {
	'ai-request': 'AI request',
};

const FALLBACK_ICON = 'help_outline';
const WILDCARD_ICON = 'shield';

export function actionLabel(value: string): string {
	if (value === '*') return 'Full access (all permissions)';
	const [prefix, verb = ''] = value.split(':');
	const prefixLabel = PREFIX_TO_LABEL[prefix] ?? capitalize(prefix);
	if (verb === '*') return `Full ${prefixLabel.toLowerCase()} access`;
	if (!verb) return prefixLabel;
	return `${prefixLabel} ${verbInLabel(verb)}`;
}

export function actionShortLabel(value: string): string {
	if (value === '*') return 'Full access';
	const verb = value.split(':')[1] ?? '';
	if (verb === '*' || verb === '') return 'Full access';
	return capitalize(verbInLabel(verb));
}

export function actionIcon(value: string): string {
	if (value === '*') return WILDCARD_ICON;
	const verb = value.split(':')[1] ?? '';
	if (verb === '*') return WILDCARD_ICON;
	return VERB_TO_ICON[verb] ?? FALLBACK_ICON;
}

// Returns the verb as it should appear inside a sentence-case label
// (e.g. inside "Connection read"). For short labels, capitalize the first letter
// of the result.
function verbInLabel(verb: string): string {
	const override = VERB_DISPLAY_OVERRIDE[verb];
	if (override) return override;
	return verb.split('-').join(' ');
}

function capitalize(text: string): string {
	return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}
