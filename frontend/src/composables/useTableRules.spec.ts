import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type EffectScope, effectScope } from 'vue';
import ActionDeleteDialog from '@/components/table/ActionDeleteDialog.vue';
import { tableEvents } from '@/lib/table-events';
import { CustomActionMethod, EventType } from '@/models/table';
import { type EditableRule, useTableRules } from './useTableRules';

const tables = vi.hoisted(() => ({ fetchRules: vi.fn(), saveRule: vi.fn(), updateRule: vi.fn() }));
const dialog = vi.hoisted(() => ({ open: vi.fn() }));
const trackTableEvent = vi.hoisted(() => vi.fn());

vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));
vi.mock('@/composables/useDialog', () => ({ useDialog: () => dialog }));
vi.mock('@/components/table/analytics', () => ({ trackTableEvent }));

function rule(title: string, overrides: Partial<EditableRule> = {}): EditableRule {
	return { id: '', title, table_name: 'user', events: [], table_actions: [], ...overrides };
}

let scope: EffectScope | null = null;

/** Inside an effect scope, so the `ruleDeleted` subscription ends with the test. */
function setup() {
	scope = effectScope();
	const rules = scope.run(() => useTableRules({ connectionId: '12345678', tableName: 'users' }));
	if (!rules) throw new Error('useTableRules() returned nothing');
	return rules;
}

afterEach(() => {
	scope?.stop();
	scope = null;
});

describe('useTableRules', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tables.fetchRules.mockResolvedValue({ action_rules: [], display_name: 'Test Table' });
	});

	it('loads the rules and selects the first one, adding the trailing trigger placeholder', async () => {
		tables.fetchRules.mockResolvedValue({
			action_rules: [rule('rule 1', { id: 'r1', events: [{ event: EventType.AddRow }] })],
			display_name: 'People',
		});
		const rules = setup();
		await rules.load();

		expect(tables.fetchRules).toHaveBeenCalledWith('12345678', 'users');
		expect(rules.selectedRule.value?.title).toBe('rule 1');
		expect(rules.selectedRule.value?.events).toEqual([{ event: EventType.AddRow }, { event: null }]);
		expect(rules.selectedEvents.value).toEqual([EventType.AddRow, null]);
		expect(document.title).toBe('People - Actions | Rocketadmin');
	});

	it('shows nothing when the rules cannot be loaded', async () => {
		tables.fetchRules.mockRejectedValue(new Error('nope'));
		const rules = setup();
		await rules.load();
		expect(rules.rulesData.value).toBeNull();
	});

	it('sets the selected rule and its title', () => {
		const rules = setup();
		const selected = rule('rule 1', { id: 'rule_12345678', events: [{ event: null }] });
		rules.setSelectedRule(selected);
		expect(rules.selectedRule.value).toEqual(selected);
		expect(rules.selectedRuleTitle.value).toBe('rule 1');
		expect(rules.isCreationMode.value).toBe(false);
	});

	it('starts a new rule with a URL action', async () => {
		const rules = setup();
		await rules.load();
		rules.addNewRule();

		expect(rules.newRule.value).toEqual({
			id: '',
			title: '',
			table_name: 'users',
			events: [{ event: null }],
			table_actions: [{ method: CustomActionMethod.URL, emails: [], url: '' }],
		});
		expect(rules.rules.value).toHaveLength(1);
		expect(rules.isCreationMode.value).toBe(true);
	});

	it('rejects an empty or duplicate name for a new rule', () => {
		const rules = setup();
		rules.newRule.value = rule('');
		rules.handleAddNewRule();
		expect(rules.actionNameError.value).toBe('The name cannot be empty.');

		rules.rules.value = [rule('rule 1')];
		rules.newRule.value = rule('rule 1');
		rules.handleAddNewRule();
		expect(rules.actionNameError.value).toBe('You already have an action with this name.');
	});

	it('adds a named new rule to the list and selects it', () => {
		const rules = setup();
		rules.rules.value = [rule('rule 1', { id: 'rule_12345678' })];
		rules.newRule.value = rule('rule 2');

		rules.handleAddNewRule();

		expect(rules.selectedRule.value).toEqual(rule('rule 2'));
		expect(rules.selectedRuleTitle.value).toBe('rule 2');
		expect(rules.rules.value).toEqual([rule('rule 1', { id: 'rule_12345678' }), rule('rule 2')]);
		expect(rules.newRule.value).toBeNull();
	});

	it('undoing a new rule drops it and selects the first remaining one', async () => {
		const existing = rule('rule 1', { id: 'r1', events: [{ event: null }] });
		tables.fetchRules.mockResolvedValue({ action_rules: [existing] });
		const rules = setup();
		await rules.load();
		rules.addNewRule();

		rules.undoRule();

		expect(rules.rules.value?.map((r) => r.title)).toEqual(['rule 1']);
		expect(rules.selectedRule.value?.title).toBe('rule 1');
		expect(rules.newRule.value).toBeNull();
		expect(rules.isCreationMode.value).toBe(false);
	});

	it('undoing the only rule leaves nothing selected', () => {
		const rules = setup();
		rules.rules.value = [];
		rules.addNewRule();
		rules.undoRule();
		expect(rules.selectedRule.value).toBeNull();
		expect(rules.rules.value).toEqual([]);
	});

	it('removes an unsaved rule locally, and asks before deleting a saved one', () => {
		const rules = setup();
		const second = rule('rule 2', { events: [{ event: null }] });
		rules.rules.value = [rule('rule 1', { events: [{ event: null }] }), second];
		rules.setSelectedRule(rules.rules.value[0] as EditableRule);

		rules.handleRemoveRule();
		expect(rules.rules.value.map((r) => r.title)).toEqual(['rule 2']);
		expect(rules.selectedRule.value?.title).toBe('rule 2');
		expect(dialog.open).not.toHaveBeenCalled();

		const saved = rule('rule 3', { id: 'rule_3', events: [{ event: null }] });
		rules.setSelectedRule(saved);
		rules.handleRemoveRule();
		expect(dialog.open).toHaveBeenCalledWith(ActionDeleteDialog, {
			data: { connectionID: '12345678', tableName: 'users', rule: saved },
		});
	});

	it('toggles triggers; the custom trigger brings its button settings', () => {
		const rules = setup();
		rules.setSelectedRule(rule('r', { events: [{ event: null }] }));

		rules.toggleTriggerTile(EventType.UpdateRow);
		rules.toggleTriggerTile(EventType.Custom);
		expect(rules.selectedEvents.value).toEqual([null, EventType.UpdateRow, EventType.Custom]);
		expect(rules.selectedRule.value?.events).toEqual([
			{ event: EventType.UpdateRow },
			{ event: EventType.Custom },
			{ event: null },
		]);
		expect(rules.selectedRuleCustomEvent.value).toEqual({
			event: EventType.Custom,
			title: '',
			type: 'single',
			icon: '',
			require_confirmation: false,
		});
		expect(rules.hasTriggersSelected.value).toBe(true);

		rules.toggleTriggerTile(EventType.Custom);
		expect(rules.selectedRuleCustomEvent.value).toBeNull();
		expect(rules.selectedRule.value?.events).toEqual([{ event: EventType.UpdateRow }, { event: null }]);
	});

	it('reports what is missing instead of saving an incomplete rule', async () => {
		const rules = setup();
		rules.setSelectedRule(
			rule('', { events: [{ event: null }], table_actions: [{ method: CustomActionMethod.URL, emails: [], url: '' }] }),
		);
		expect(await rules.handleRuleSubmitting()).toBe('title');

		rules.setTitle('Notify');
		expect(await rules.handleRuleSubmitting()).toBe('trigger');

		rules.toggleTriggerTile(EventType.AddRow);
		expect(await rules.handleRuleSubmitting()).toBe('url');

		rules.selectActionMethod('EMAIL');
		expect(await rules.handleRuleSubmitting()).toBe('emails');

		rules.selectActionMethod('SLACK');
		expect(await rules.handleRuleSubmitting()).toBe('slack');
		expect(tables.saveRule).not.toHaveBeenCalled();
	});

	it('saves a new rule without the placeholder, merging the custom button, then reselects it', async () => {
		tables.saveRule.mockResolvedValue({ id: 'new-id', title: 'Ping' });
		const rules = setup();
		await rules.load();
		rules.addNewRule();
		rules.setTitle('Ping');
		rules.toggleTriggerTile(EventType.Custom);
		rules.updateIcon('bolt');
		const action = rules.selectedRule.value?.table_actions[0];
		if (action) action.url = 'https://hook.test';
		const saved = rule('Ping', { id: 'new-id', events: [{ event: EventType.Custom }] });
		tables.fetchRules.mockResolvedValue({ action_rules: [saved] });

		expect(await rules.handleRuleSubmitting()).toBeNull();
		await flushPromises();

		expect(tables.saveRule).toHaveBeenCalledWith(
			'12345678',
			'users',
			expect.objectContaining({
				title: 'Ping',
				events: [{ event: EventType.Custom, title: '', type: 'single', icon: 'bolt', require_confirmation: false }],
			}),
		);
		expect(trackTableEvent).toHaveBeenCalledWith('Rules: rule is saved successfully');
		expect(rules.selectedRule.value?.id).toBe('new-id');
		expect(rules.isSaved.value).toBe(true);
		expect(rules.submitting.value).toBe(false);
	});

	it('updates a saved rule', async () => {
		tables.updateRule.mockResolvedValue({ id: 'r1', title: 'Hook' });
		const rules = setup();
		rules.setSelectedRule(
			rule('Hook', {
				id: 'r1',
				events: [{ event: EventType.DeleteRow }],
				table_actions: [{ method: CustomActionMethod.URL, emails: [], url: 'https://x.test' }],
			}),
		);

		await rules.handleRuleSubmitting();

		expect(tables.updateRule).toHaveBeenCalledWith(
			'12345678',
			'users',
			expect.objectContaining({ id: 'r1', events: [{ event: EventType.DeleteRow }] }),
		);
	});

	it('reloads the rules when one is deleted', async () => {
		const rules = setup();
		await rules.load();
		tables.fetchRules.mockClear();

		tableEvents.emit('ruleDeleted', { connectionID: '12345678', tableName: 'users', ruleId: 'r1' });
		await flushPromises();

		expect(tables.fetchRules).toHaveBeenCalledTimes(1);
		expect(rules.rulesData.value).toEqual({ action_rules: [], display_name: 'Test Table' });
	});
});
