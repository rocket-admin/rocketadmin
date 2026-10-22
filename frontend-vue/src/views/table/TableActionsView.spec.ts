import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import ActionDeleteDialog from '@/components/table/ActionDeleteDialog.vue';
import { EventType } from '@/models/table';
import TableActionsView from './TableActionsView.vue';
import { buttonByText, byTestId, mountTableView } from './tableTestUtils';

const connections = vi.hoisted(() => ({
	currentConnection: { title: 'Shop', database: 'shop' },
	connectionSigningKey: 'sign-key-1',
}));
const tables = vi.hoisted(() => ({ fetchRules: vi.fn(), saveRule: vi.fn(), updateRule: vi.fn() }));
const user = vi.hoisted(() => ({ currentUser: { company: { id: 'company-1' } } }));
const company = vi.hoisted(() => ({ fetchCompanyMembers: vi.fn() }));
const notifications = vi.hoisted(() => ({ alert: null, showSuccessSnackbar: vi.fn() }));
const dialog = vi.hoisted(() => ({ open: vi.fn() }));
const trackTableEvent = vi.hoisted(() => vi.fn());

vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => reactive(connections) }));
vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));
vi.mock('@/stores/user', () => ({ useUserStore: () => reactive(user) }));
vi.mock('@/stores/company', () => ({ useCompanyStore: () => company }));
vi.mock('@/stores/notifications', () => ({ useNotificationsStore: () => reactive(notifications) }));
vi.mock('@/stores/ui-settings', () => ({ useUiSettingsStore: () => reactive({ isDarkMode: false }) }));
vi.mock('@/composables/useDialog', () => ({ useDialog: () => dialog }));
vi.mock('@/components/table/analytics', () => ({ trackTableEvent }));

const PATTERN = '/dashboard/:connectionId/:tableName/actions';
const mountPage = () => mountTableView(TableActionsView, PATTERN, '/dashboard/12345678/users/actions');

const savedRule = {
	id: 'r1',
	title: 'Notify sales',
	table_name: 'users',
	events: [{ event: EventType.AddRow }],
	table_actions: [{ method: 'EMAIL', emails: ['a@x.test'], url: '' }],
};

describe('TableActionsView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tables.fetchRules.mockResolvedValue({ action_rules: [], display_name: 'People' });
		company.fetchCompanyMembers.mockResolvedValue([
			{ email: 'a@x.test', name: 'Ann' },
			{ email: 'b@x.test', name: '' },
		]);
	});

	it('shows the empty state, and "Create first automation" starts a new one', async () => {
		const { wrapper } = await mountPage();

		expect(wrapper.text()).toContain('No automations yet');
		expect(wrapper.text()).toContain('Automate your database workflows');
		await byTestId(wrapper, 'create-first-automation-button').trigger('click');

		expect(trackTableEvent).toHaveBeenCalledWith('Actions: add first action is clicked');
		expect(wrapper.text()).toContain('New automation');
		expect(byTestId(wrapper, 'rule-title-input').exists()).toBe(true);
		expect(wrapper.text()).toContain('Add a trigger first');
		expect(byTestId(wrapper, 'add-automation-button').exists()).toBe(false);

		await buttonByText(wrapper, 'Cancel').trigger('click');
		expect(wrapper.text()).toContain('Automate your database workflows');
		wrapper.unmount();
	});

	it('creates a webhook automation', async () => {
		tables.saveRule.mockResolvedValue({ id: 'new', title: 'Hook' });
		const { wrapper } = await mountPage();
		await byTestId(wrapper, 'add-automation-button').trigger('click');

		await byTestId(wrapper, 'rule-title-input').setValue('Hook');
		await byTestId(wrapper, 'trigger-UPDATE_ROW').setValue(true);
		expect(wrapper.text()).toContain('Use the code snippets below to verify requests.');
		await wrapper.find('input[name="action-url"]').setValue('https://hook.test');
		tables.fetchRules.mockResolvedValue({
			action_rules: [{ ...savedRule, id: 'new', title: 'Hook', events: [{ event: EventType.UpdateRow }] }],
		});
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(tables.saveRule).toHaveBeenCalledWith(
			'12345678',
			'users',
			expect.objectContaining({
				title: 'Hook',
				events: [{ event: EventType.UpdateRow }],
				table_actions: [{ method: 'URL', emails: [], url: 'https://hook.test' }],
			}),
		);
		expect(byTestId(wrapper, 'rule-save-button').text()).toBe('Saved');
		wrapper.unmount();
	});

	it('does not save without a name, and focuses it', async () => {
		const { wrapper } = await mountPage();
		await byTestId(wrapper, 'add-automation-button').trigger('click');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(tables.saveRule).not.toHaveBeenCalled();
		expect(document.activeElement).toBe(byTestId(wrapper, 'rule-title-input').element);
		wrapper.unmount();
	});

	it('edits a saved email automation with the company members to notify', async () => {
		tables.fetchRules.mockResolvedValue({ action_rules: [savedRule], display_name: 'People' });
		tables.updateRule.mockResolvedValue({ id: 'r1', title: 'Notify sales' });
		const { wrapper } = await mountPage();

		expect(company.fetchCompanyMembers).toHaveBeenCalledWith('company-1');
		const options = wrapper.findAll('select[name="notification-emails"] option');
		expect(options.map((option) => option.text())).toEqual(['Ann | a@x.test', 'b@x.test']);
		expect(wrapper.findAll('select[name="notification-emails"] option:checked').map((o) => o.text())).toEqual([
			'Ann | a@x.test',
		]);

		await wrapper.find('select[name="notification-emails"]').setValue(['0', '1']);
		await wrapper.find('form').trigger('submit');
		await flushPromises();
		expect(tables.updateRule).toHaveBeenCalledWith(
			'12345678',
			'users',
			expect.objectContaining({
				id: 'r1',
				table_actions: [expect.objectContaining({ emails: ['a@x.test', 'b@x.test'] })],
			}),
		);

		await byTestId(wrapper, 'rule-delete-button').trigger('click');
		expect(dialog.open).toHaveBeenCalledWith(ActionDeleteDialog, {
			data: { connectionID: '12345678', tableName: 'users', rule: expect.objectContaining({ id: 'r1' }) },
		});
		wrapper.unmount();
	});

	it('links back to the table', async () => {
		tables.fetchRules.mockResolvedValue({ action_rules: [savedRule], display_name: 'People' });
		const { wrapper } = await mountPage();
		expect(buttonByText(wrapper, 'Back').attributes('href')).toBe('/dashboard/12345678/users');
		expect(wrapper.text()).toContain('Automations');
		wrapper.unmount();
	});
});
