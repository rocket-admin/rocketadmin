import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { vTooltip } from '@/components/ui';
import type { CedarPolicyItem, PolicyActionGroup } from '@/lib/cedar-policy-items';
import CedarPolicyList from './CedarPolicyList.vue';
import { buildDisplayGroups, buildFilteredGroups } from './policyList';
import { buttonByText, selectOption } from './testUtils';

const fixtureGroups: PolicyActionGroup[] = [
	{
		group: 'Connection',
		actions: [
			{ value: 'connection:read', resource: 'connection' },
			{ value: 'connection:edit', resource: 'connection' },
		],
	},
	{
		group: 'Group',
		actions: [
			{ value: 'group:read', resource: 'group' },
			{ value: 'group:edit', resource: 'group' },
		],
	},
	{
		group: 'Table',
		actions: [
			{ value: 'table:read', resource: 'table' },
			{ value: 'table:edit', resource: 'table' },
		],
	},
	{
		group: 'Dashboard',
		actions: [
			{ value: 'dashboard:read', resource: 'dashboard' },
			{ value: 'dashboard:create', resource: 'dashboard' },
			{ value: 'dashboard:edit', resource: 'dashboard' },
		],
	},
];

vi.mock('@/stores/users', () => ({ useUsersStore: () => ({ availablePermissionGroups: fixtureGroups }) }));

const fakeTables = [
	{ tableName: 'customers', displayName: 'Customers' },
	{ tableName: 'orders', displayName: 'Orders' },
];

const fakeDashboards = [
	{ id: 'dash-1', name: 'Sales Dashboard' },
	{ id: 'dash-2', name: 'Analytics' },
];

function mountList(policies: CedarPolicyItem[] = [], adding = false) {
	return mount(CedarPolicyList, {
		props: { policies, adding, availableTables: fakeTables, availableDashboards: fakeDashboards },
		global: { directives: { tooltip: vTooltip } },
	});
}

function emittedPolicies(wrapper: VueWrapper): CedarPolicyItem[][] {
	return (wrapper.emitted('update:policies') ?? []).map(([value]) => value as CedarPolicyItem[]);
}

function fieldSelect(wrapper: VueWrapper, label: string) {
	const field = wrapper.findAll('.ui-field').find((candidate) => candidate.find('label').text().startsWith(label));
	if (!field) throw new Error(`No field ${label}`);
	return field;
}

describe('CedarPolicyList', () => {
	beforeEach(() => vi.clearAllMocks());

	it('offers to add the first policy when there are none', async () => {
		const wrapper = mountList();
		expect(wrapper.text()).toContain('No policies defined. Add a policy to grant permissions.');

		await buttonByText(wrapper, 'Add policy').trigger('click');
		expect(wrapper.emitted('update:adding')?.[0]).toEqual([true]);
	});

	it('adds a scopeless policy and closes the add row', async () => {
		const wrapper = mountList([], true);

		await selectOption(wrapper, 'Connection read');
		expect(wrapper.findAll('.ui-field')).toHaveLength(1);
		await buttonByText(wrapper, 'Add').trigger('click');

		expect(emittedPolicies(wrapper).at(-1)).toEqual([{ action: 'connection:read' }]);
		expect(wrapper.emitted('update:adding')?.at(-1)).toEqual([false]);
	});

	it('needs a table for a table action, and accepts the wildcard', async () => {
		const wrapper = mountList([], true);

		await selectOption(wrapper, 'Table edit');
		expect(buttonByText(wrapper, 'Add').attributes('disabled')).toBeDefined();
		await selectOption(fieldSelect(wrapper, 'Table'), 'All tables');
		await buttonByText(wrapper, 'Add').trigger('click');

		expect(emittedPolicies(wrapper).at(-1)).toEqual([{ action: 'table:edit', tableName: '*' }]);
	});

	it('adds a table policy for one table', async () => {
		const wrapper = mountList([], true);

		await selectOption(wrapper, 'Table read');
		await selectOption(fieldSelect(wrapper, 'Table'), 'Customers');
		await buttonByText(wrapper, 'Add').trigger('click');

		expect(emittedPolicies(wrapper).at(-1)).toEqual([{ action: 'table:read', tableName: 'customers' }]);
	});

	it('treats the prefix wildcard as table-scoped', async () => {
		const wrapper = mountList([], true);
		await selectOption(wrapper, 'Full table access');
		expect(fieldSelect(wrapper, 'Table').exists()).toBe(true);
	});

	it('needs a dashboard for a dashboard action, but not for dashboard:create', async () => {
		const wrapper = mountList([], true);

		await selectOption(wrapper, 'Dashboard create');
		expect(wrapper.text()).not.toContain('All dashboards');

		await selectOption(fieldSelect(wrapper, 'Action'), 'Dashboard edit');
		expect(buttonByText(wrapper, 'Add').attributes('disabled')).toBeDefined();
		await selectOption(fieldSelect(wrapper, 'Dashboard'), 'Sales Dashboard');
		await buttonByText(wrapper, 'Add').trigger('click');

		expect(emittedPolicies(wrapper).at(-1)).toEqual([{ action: 'dashboard:edit', dashboardId: 'dash-1' }]);
	});

	it('cancels the add row and resets it', async () => {
		const wrapper = mountList([], true);
		await selectOption(wrapper, 'Connection read');
		await buttonByText(wrapper, 'Cancel').trigger('click');

		expect(wrapper.emitted('update:adding')?.at(-1)).toEqual([false]);
		expect(wrapper.emitted('update:policies')).toBeUndefined();
	});

	it('does not offer a scopeless action that is already granted', () => {
		const wrapper = mountList([{ action: 'connection:read' }], true);
		const addForm = wrapper.find('[data-testid="policy-add-form"]');
		const labels = addForm.findAll('option').map((option) => option.text());
		expect(labels).not.toContain('Connection read');
		expect(labels).toContain('Connection edit');
	});

	it('hints which actions a table already has', async () => {
		const wrapper = mountList([{ action: 'table:read', tableName: 'customers' }], true);
		await selectOption(wrapper.find('[data-testid="policy-add-form"]'), 'Table edit');
		const labels = wrapper
			.find('[data-testid="policy-add-form"]')
			.findAll('option')
			.map((option) => option.text());
		expect(labels).toContain('Customers — Read');
	});

	it('groups the policies and shows their scope by display name', () => {
		const wrapper = mountList([
			{ action: '*' },
			{ action: 'table:read', tableName: 'customers' },
			{ action: 'table:edit', tableName: 'unknown' },
			{ action: 'table:*', tableName: '*' },
			{ action: 'dashboard:read', dashboardId: 'dash-1' },
			{ action: 'dashboard:edit', dashboardId: '*' },
		]);

		const headers = wrapper
			.findAll('.policy-group__header')
			.map((header) => `${header.find('.policy-group__label').text()} ${header.find('.policy-group__count').text()}`);
		expect(headers).toEqual(['General 1', 'Table 3', 'Dashboard 2']);
		const text = wrapper.text();
		expect(text).toContain('Customers');
		expect(text).toContain('unknown');
		expect(text).toContain('All tables');
		expect(text).toContain('Sales Dashboard');
		expect(text).toContain('All dashboards');
	});

	it('collapses a group', async () => {
		const wrapper = mountList([{ action: 'connection:read' }]);
		await wrapper.find('.policy-group__header').trigger('click');
		expect(wrapper.find('.policy-group__header').attributes('aria-expanded')).toBe('false');
		expect(wrapper.findAll('[data-testid="policy-item"]')).toHaveLength(0);
	});

	it('removes a policy', async () => {
		const wrapper = mountList([{ action: 'connection:read' }, { action: 'group:read' }]);
		await wrapper.findAll('button[aria-label="Delete"]')[0]?.trigger('click');
		expect(emittedPolicies(wrapper).at(-1)).toEqual([{ action: 'group:read' }]);
	});

	it('edits a policy inline and saves it', async () => {
		const wrapper = mountList([{ action: 'connection:read' }]);
		await wrapper.find('button[aria-label="Edit"]').trigger('click');

		const select = wrapper.find('select');
		const selected = select.findAll('option').find((option) => (option.element as HTMLOptionElement).selected);
		expect(selected?.text()).toBe('Connection read');
		await selectOption(wrapper, 'Connection edit');
		await buttonByText(wrapper, 'Save').trigger('click');

		expect(emittedPolicies(wrapper).at(-1)).toEqual([
			{ action: 'connection:edit', tableName: undefined, dashboardId: undefined },
		]);
		expect(wrapper.find('select').exists()).toBe(false);
	});

	it('cancels an edit without emitting', async () => {
		const wrapper = mountList([{ action: 'connection:read' }]);
		await wrapper.find('button[aria-label="Edit"]').trigger('click');
		await selectOption(wrapper, 'Connection edit');
		await buttonByText(wrapper, 'Cancel').trigger('click');

		expect(wrapper.emitted('update:policies')).toBeUndefined();
		expect(wrapper.text()).toContain('Read');
	});

	it('reports and discards pending changes', async () => {
		const wrapper = mountList([{ action: 'connection:read' }], true);
		const list = wrapper.vm as unknown as { hasPendingChanges(): boolean; discardPending(): void };
		expect(list.hasPendingChanges()).toBe(false);

		await selectOption(wrapper.find('[data-testid="policy-add-form"]'), 'Group read');
		expect(list.hasPendingChanges()).toBe(true);

		list.discardPending();
		await flushPromises();
		expect(wrapper.emitted('update:adding')?.at(-1)).toEqual([false]);
	});
});

describe('policy action groups', () => {
	it('synthesizes General and the prefix wildcards', () => {
		const groups = buildFilteredGroups(buildDisplayGroups(fixtureGroups), [], -1);
		expect(groups.find((group) => group.group === 'General')?.actions[0]?.value).toBe('*');

		const table = groups.find((group) => group.group === 'Table');
		expect(table?.actions[0]).toEqual({ value: 'table:*', resource: 'table' });
		expect(groups.find((group) => group.group === 'Dashboard')?.actions[0]?.value).toBe('dashboard:*');
		expect(groups.find((group) => group.group === 'Connection')?.actions[0]?.value).toBe('connection:read');
	});

	it('keeps the edited policy own action available', () => {
		const display = buildDisplayGroups(fixtureGroups);
		const policies = [{ action: 'connection:read' }];
		const values = (excludeIndex: number) =>
			buildFilteredGroups(display, policies, excludeIndex).flatMap((group) => group.actions.map((a) => a.value));
		expect(values(-1)).not.toContain('connection:read');
		expect(values(0)).toContain('connection:read');
	});
});
