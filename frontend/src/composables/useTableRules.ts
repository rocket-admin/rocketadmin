// The logic of frontend/src/app/components/dashboard/db-table-view/db-table-actions (the table's
// "Automations" page): the table's rules, the one being edited, its triggers (add / update / delete
// row, or a custom button) and its action (URL webhook, email or Slack).
//
// As in Angular, the rule being edited is the same object as its entry in `rules`, and its events
// keep a trailing `{ event: null }` placeholder (the old one-select-per-trigger form needed it);
// placeholders are dropped before saving.
import { computed, type MaybeRefOrGetter, ref, toRaw, toValue } from 'vue';
import ActionDeleteDialog from '@/components/table/ActionDeleteDialog.vue';
import { trackTableEvent } from '@/components/table/analytics';
import { useDialog } from '@/composables/useDialog';
import { normalizeTableName } from '@/lib/normalize';
import { onTableEvent } from '@/lib/table-events';
import {
	type CustomAction,
	CustomActionMethod,
	CustomActionType,
	type CustomEvent,
	EventType,
	type Rule,
} from '@/models/table';
import { useTablesStore } from '@/stores/tables';

/** An event of the rule being edited; `event: null` is the trailing placeholder. */
export type RuleEvent = { event: EventType | null } & Partial<Omit<CustomEvent, 'event'>>;

/** A rule as the page edits it (events may hold the placeholder). */
export interface EditableRule extends Omit<Rule, 'events'> {
	events: RuleEvent[];
}

export interface RulesData {
	table_name?: string;
	display_name?: string;
	action_rules: EditableRule[];
}

/** What is missing when the rule cannot be saved yet; the page points the user at it. */
export type RuleProblem = 'title' | 'trigger' | 'url' | 'emails' | 'slack';

export const AVAILABLE_EVENTS = [
	{ value: EventType.AddRow, label: 'Add row' },
	{ value: EventType.UpdateRow, label: 'Update row' },
	{ value: EventType.DeleteRow, label: 'Delete row' },
	{ value: EventType.Custom, label: 'Custom' },
];

export interface UseTableRulesOptions {
	connectionId: MaybeRefOrGetter<string>;
	tableName: MaybeRefOrGetter<string>;
}

export function useTableRules({ connectionId, tableName }: UseTableRulesOptions) {
	const tables = useTablesStore();
	const dialog = useDialog();

	/** undefined while loading, null when the rules could not be loaded. */
	const rulesData = ref<RulesData | null | undefined>(undefined);
	const rules = ref<EditableRule[] | null>(null);
	const selectedRule = ref<EditableRule | null>(null);
	const selectedRuleCustomEvent = ref<RuleEvent | null>(null);
	const selectedRuleTitle = ref('');
	const newRule = ref<EditableRule | null>(null);
	const actionNameError = ref<string | null>(null);
	const selectedEvents = ref<(EventType | null)[]>([]);
	const submitting = ref(false);
	const isSaved = ref(false);
	const isCreationMode = ref(false);

	const normalizedTableName = computed(() => normalizeTableName(toValue(tableName)));
	const displayTableName = computed(() => rulesData.value?.display_name || normalizedTableName.value);
	const hasTriggersSelected = computed(() => selectedRule.value?.events.some((e) => e.event !== null) ?? false);
	const saveDisabledReason = computed(() => {
		if (!selectedRuleTitle.value) return 'Enter automation name';
		if (!hasTriggersSelected.value) return 'Select at least one trigger';
		return '';
	});
	/** The method of the rule's (only) action, upper-cased as the toggle values are. */
	const actionMethod = computed(() => String(selectedRule.value?.table_actions[0]?.method ?? ''));

	onTableEvent('ruleDeleted', async () => {
		try {
			await refreshRules();
		} catch {
			// Reported by the store.
		}
	});

	async function load(): Promise<void> {
		try {
			const data = await getRules();
			rulesData.value = data;
			rules.value = data.action_rules;
			const first = rules.value[0];
			if (first) setSelectedRule(first);
			document.title = `${displayTableName.value} - Actions | Rocketadmin`;
		} catch {
			rulesData.value = null;
		}
	}

	async function refreshRules(selectId?: string): Promise<void> {
		const data = await getRules();
		rulesData.value = data;
		rules.value = data.action_rules;
		const current = selectId ? rules.value.find((rule) => rule.id === selectId) : rules.value[0];
		if (current) setSelectedRule(current);
	}

	function setSelectedRule(rule: EditableRule): void {
		selectedRule.value = rule;
		const current = selectedRule.value;
		selectedRuleTitle.value = rule.title;
		isCreationMode.value = !rule.id;
		if (current.events[current.events.length - 1]?.event !== null) current.events.push({ event: null });
		selectedEvents.value = current.events.map((event) => event.event);
		selectedRuleCustomEvent.value = current.events.find((event) => event.event === EventType.Custom) ?? null;
	}

	function switchRulesView(rule: EditableRule): void {
		setSelectedRule(rule);
	}

	function updateIcon(icon: string | null): void {
		if (selectedRuleCustomEvent.value) selectedRuleCustomEvent.value.icon = icon ?? '';
	}

	function setCustomEventType(type: string): void {
		if (selectedRuleCustomEvent.value) selectedRuleCustomEvent.value.type = type as CustomActionType;
		isSaved.value = false;
	}

	function setTitle(title: string): void {
		selectedRuleTitle.value = title;
		if (isCreationMode.value && selectedRule.value) selectedRule.value.title = title;
	}

	function addNewRule(): void {
		newRule.value = {
			id: '',
			title: '',
			table_name: toValue(tableName),
			events: [{ event: null }],
			table_actions: [{ method: CustomActionMethod.URL, emails: [], url: '' }],
		};
		rules.value = [...(rules.value ?? []), newRule.value];
		setSelectedRule(newRule.value);
		isCreationMode.value = true;
	}

	/** The name-first flow of the older page: validates the new rule's name, then lists it. */
	function handleAddNewRule(): void {
		actionNameError.value = null;
		const rule = newRule.value;
		if (!rule) return;
		if (rule.title === '') {
			actionNameError.value = 'The name cannot be empty.';
			return;
		}
		if ((rules.value ?? []).some((existing) => existing.title === rule.title)) {
			actionNameError.value = 'You already have an action with this name.';
			return;
		}
		selectedRule.value = { ...rule };
		selectedRuleTitle.value = rule.title;
		rules.value = [...(rules.value ?? []), selectedRule.value];
		newRule.value = null;
		isCreationMode.value = false;
	}

	function undoRule(): void {
		const unsaved = newRule.value ? toRaw(newRule.value) : null;
		if (unsaved) rules.value = (rules.value ?? []).filter((rule) => toRaw(rule) !== unsaved);
		newRule.value = null;
		isCreationMode.value = false;
		selectFirstOrNothing();
	}

	function handleRemoveRule(): void {
		const rule = selectedRule.value;
		if (!rule) return;
		if (rule.id) {
			openDeleteRuleDialog();
		} else {
			removeRuleFromLocalList(rule.title);
		}
	}

	function removeRuleFromLocalList(ruleTitle: string): void {
		rules.value = (rules.value ?? []).filter((rule) => rule.title !== ruleTitle);
		selectFirstOrNothing();
	}

	function openDeleteRuleDialog(): void {
		dialog.open(ActionDeleteDialog, {
			data: { connectionID: toValue(connectionId), tableName: toValue(tableName), rule: selectedRule.value },
		});
	}

	function toggleTriggerTile(eventType: EventType): void {
		const rule = selectedRule.value;
		if (!rule) return;
		isSaved.value = false;
		if (selectedEvents.value.includes(eventType)) {
			rule.events = rule.events.filter((e) => e.event !== eventType);
			selectedEvents.value = selectedEvents.value.filter((e) => e !== eventType);
			if (eventType === EventType.Custom) selectedRuleCustomEvent.value = null;
		} else {
			rule.events = rule.events.filter((e) => e.event !== null);
			rule.events.push({ event: eventType });
			selectedEvents.value.push(eventType);
			if (eventType === EventType.Custom) {
				selectedRuleCustomEvent.value = {
					event: EventType.Custom,
					title: '',
					type: CustomActionType.Single,
					icon: '',
					require_confirmation: false,
				};
			}
		}
		// Keep the trailing placeholder.
		if (rule.events[rule.events.length - 1]?.event !== null) rule.events.push({ event: null });
	}

	function selectActionMethod(method: string): void {
		isSaved.value = false;
		const action = selectedRule.value?.table_actions[0];
		if (action) action.method = method as CustomActionMethod;
	}

	/** What the rule still lacks before it can be saved, or null when it is complete. */
	function findProblem(): RuleProblem | null {
		if (!selectedRuleTitle.value) return 'title';
		if (!hasTriggersSelected.value) return 'trigger';
		const action: CustomAction | undefined = selectedRule.value?.table_actions[0];
		if (action) {
			const method = String(action.method).toUpperCase();
			if (method === 'URL' && !action.url) return 'url';
			if (method === 'EMAIL' && !action.emails?.length) return 'emails';
			if (method === 'SLACK' && !action.slack_url) return 'slack';
		}
		return null;
	}

	/** Saves the rule (create or update). Returns what is missing instead when it is incomplete. */
	async function handleRuleSubmitting(): Promise<RuleProblem | null> {
		const problem = findProblem();
		if (problem) return problem;
		if (selectedRule.value?.id) {
			await updateRule();
		} else {
			await addRule();
		}
		return null;
	}

	async function addRule(): Promise<void> {
		const rule = prepareSelectedRule();
		if (!rule) return;
		newRule.value = null;
		submitting.value = true;
		try {
			const res = await tables.saveRule(toValue(connectionId), toValue(tableName), rule);
			trackTableEvent('Rules: rule is saved successfully');
			await afterSave(res.id);
		} catch {
			// Reported by the store.
		} finally {
			submitting.value = false;
		}
	}

	async function updateRule(): Promise<void> {
		const rule = prepareSelectedRule();
		if (!rule) return;
		submitting.value = true;
		try {
			const res = await tables.updateRule(toValue(connectionId), toValue(tableName), rule);
			await afterSave(res.id);
		} catch {
			// Reported by the store.
		} finally {
			submitting.value = false;
		}
	}

	/** Drops the placeholders and merges the custom button's settings into its event. */
	function prepareSelectedRule(): Rule | null {
		const rule = selectedRule.value;
		if (!rule) return null;
		if (selectedRuleTitle.value) rule.title = selectedRuleTitle.value;
		rule.events = rule.events
			.filter((event) => event.event !== null)
			.map((event) =>
				event.event === EventType.Custom
					? { ...event, ...selectedRuleCustomEvent.value, event: EventType.Custom }
					: event,
			);
		return rule as Rule;
	}

	async function afterSave(id: string | undefined): Promise<void> {
		submitting.value = false;
		try {
			await refreshRules(id);
			isSaved.value = true;
		} catch {
			// Reported by the store.
		}
	}

	function selectFirstOrNothing(): void {
		const first = rules.value?.[0];
		if (first) {
			setSelectedRule(first);
		} else {
			selectedRule.value = null;
		}
	}

	function getRules(): Promise<RulesData> {
		return tables.fetchRules(toValue(connectionId), toValue(tableName)) as Promise<RulesData>;
	}

	return {
		rulesData,
		rules,
		selectedRule,
		selectedRuleCustomEvent,
		selectedRuleTitle,
		newRule,
		actionNameError,
		selectedEvents,
		submitting,
		isSaved,
		isCreationMode,
		displayTableName,
		hasTriggersSelected,
		saveDisabledReason,
		actionMethod,
		load,
		setSelectedRule,
		switchRulesView,
		updateIcon,
		setCustomEventType,
		setTitle,
		addNewRule,
		handleAddNewRule,
		undoRule,
		handleRemoveRule,
		removeRuleFromLocalList,
		openDeleteRuleDialog,
		toggleTriggerTile,
		selectActionMethod,
		findProblem,
		handleRuleSubmitting,
		addRule,
		updateRule,
	};
}
