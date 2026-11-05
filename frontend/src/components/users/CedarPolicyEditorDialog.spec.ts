import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import CedarPolicyEditorDialog from './CedarPolicyEditorDialog.vue';
import { buttonByText, mountDialog } from './testUtils';

const users = vi.hoisted(() => ({
	saveCedarPolicy: vi.fn(),
	availablePermissionGroups: [
		{
			group: 'Connection',
			actions: [
				{ value: 'connection:read', resource: 'connection' as const },
				{ value: 'connection:edit', resource: 'connection' as const },
			],
		},
	],
}));
const tables = vi.hoisted(() => ({ fetchTables: vi.fn() }));
const validator = vi.hoisted(() => ({ validate: vi.fn() }));

vi.mock('@/stores/users', () => ({ useUsersStore: () => users }));
vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));
vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => ({ connectionID: 'conn-123' }) }));
vi.mock('@/stores/dashboards', () => ({
	useDashboardsQuery: () => ({ dashboards: ref([{ id: 'dash-1', name: 'Sales' }]) }),
}));
vi.mock('@/composables/useCedarValidator', () => ({ useCedarValidator: () => validator }));

const fakeTables = [
	{ table: 'customers', display_name: 'Customers', permissions: {} },
	{ table: 'orders', display_name: '', permissions: {} },
];

const cedarPolicyWithConnection = [
	'permit(',
	'  principal,',
	'  action == RocketAdmin::Action::"connection:read",',
	'  resource == RocketAdmin::Connection::"conn-123"',
	');',
].join('\n');

function mountEditor(cedarPolicy: string | null = cedarPolicyWithConnection) {
	return mountDialog(CedarPolicyEditorDialog, { groupId: 'group-123', groupTitle: 'Test Group', cedarPolicy });
}

async function switchMode(wrapper: VueWrapper, mode: 'Form' | 'Code') {
	const option = wrapper.findAll('.ui-segmented__option').find((candidate) => candidate.text() === mode);
	await option?.find('input').trigger('change');
	await flushPromises();
}

function editorMode(wrapper: VueWrapper): string {
	return wrapper.find('.ui-segmented__option--selected').text();
}

describe('CedarPolicyEditorDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
		tables.fetchTables.mockResolvedValue(fakeTables);
		users.saveCedarPolicy.mockResolvedValue(undefined);
		validator.validate.mockResolvedValue({ valid: true, errors: [] });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('titles the dialog with the group and loads the connection tables', async () => {
		const { wrapper } = await mountEditor();
		expect(wrapper.find('h2').text()).toBe('Policy — Test Group');
		expect(tables.fetchTables).toHaveBeenCalledWith('conn-123');
		wrapper.unmount();
	});

	it('starts in form mode with the existing policy parsed into items', async () => {
		const { wrapper } = await mountEditor();
		expect(editorMode(wrapper)).toBe('Form');
		expect(wrapper.find('.policy-group__label').text()).toBe('Connection');
		expect(wrapper.find('.policy-item__label').text()).toBe('Read');
		wrapper.unmount();
	});

	it('switches to code mode with the policy generated from the form', async () => {
		const { wrapper } = await mountEditor();
		await switchMode(wrapper, 'Code');

		expect(editorMode(wrapper)).toBe('Code');
		const text = (wrapper.find('textarea').element as HTMLTextAreaElement).value;
		expect(text).toContain('connection:read');
		expect(text).toContain('conn-123');
		wrapper.unmount();
	});

	it('opens advanced policies straight in code mode with a warning', async () => {
		const { wrapper } = await mountEditor('forbid(principal, action, resource);');
		expect(editorMode(wrapper)).toBe('Code');
		expect(wrapper.text()).toContain('advanced Cedar syntax');
		wrapper.unmount();
	});

	it('blocks saving when the wasm validator reports an invalid policy', async () => {
		const { wrapper, dialogRef } = await mountEditor();
		await switchMode(wrapper, 'Code');
		await wrapper.find('textarea').setValue('invalid policy text {{{');
		validator.validate.mockResolvedValueOnce({ valid: false, errors: ['unexpected token'] });

		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(validator.validate).toHaveBeenCalledWith('invalid policy text {{{');
		expect(wrapper.find('[data-testid="cedar-validation-errors"]').text()).toContain('unexpected token');
		expect(users.saveCedarPolicy).not.toHaveBeenCalled();
		expect(dialogRef.close).not.toHaveBeenCalled();
		expect(buttonByText(wrapper, 'Save').attributes('disabled')).toBeUndefined();
		wrapper.unmount();
	});

	it('saves a valid policy and closes', async () => {
		const { wrapper, dialogRef } = await mountEditor();
		await switchMode(wrapper, 'Code');
		await wrapper.find('textarea').setValue('permit(principal, action, resource);');

		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(wrapper.find('[data-testid="cedar-validation-errors"]').exists()).toBe(false);
		expect(users.saveCedarPolicy).toHaveBeenCalledWith('conn-123', 'group-123', 'permit(principal, action, resource);');
		expect(dialogRef.close).toHaveBeenCalled();
		wrapper.unmount();
	});

	it('saves the form items as Cedar', async () => {
		const { wrapper } = await mountEditor();
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		const [, , policy] = users.saveCedarPolicy.mock.calls[0] ?? [];
		expect(policy).toContain('RocketAdmin::Action::"connection:read"');
		wrapper.unmount();
	});

	it('refuses to switch to form mode while the policy is invalid', async () => {
		const { wrapper } = await mountEditor();
		await switchMode(wrapper, 'Code');
		await wrapper.find('textarea').setValue('broken ;;;');
		validator.validate.mockResolvedValueOnce({ valid: false, errors: ['parse error at line 1'] });

		await switchMode(wrapper, 'Form');

		expect(editorMode(wrapper)).toBe('Code');
		expect(wrapper.find('[data-testid="cedar-validation-errors"]').text()).toContain('parse error at line 1');
		wrapper.unmount();
	});

	it('clears validation errors when the policy text is edited', async () => {
		const { wrapper } = await mountEditor();
		await switchMode(wrapper, 'Code');
		validator.validate.mockResolvedValueOnce({ valid: false, errors: ['some old error'] });
		await wrapper.find('form').trigger('submit');
		await flushPromises();
		expect(wrapper.find('[data-testid="cedar-validation-errors"]').exists()).toBe(true);

		await wrapper.find('textarea').setValue('permit(principal, action, resource);');

		expect(wrapper.find('[data-testid="cedar-validation-errors"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('clears validation errors when switching to code mode', async () => {
		const { wrapper } = await mountEditor();
		await switchMode(wrapper, 'Code');
		await wrapper.find('textarea').setValue('broken');
		validator.validate.mockResolvedValueOnce({ valid: false, errors: ['stale error'] });
		await switchMode(wrapper, 'Form');
		expect(wrapper.text()).toContain('stale error');

		// Back to a valid text, then into the form and out again.
		await wrapper.find('textarea').setValue('permit(principal, action, resource);');
		await switchMode(wrapper, 'Form');
		await switchMode(wrapper, 'Code');
		expect(wrapper.find('[data-testid="cedar-validation-errors"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('opens the add row from the footer', async () => {
		const { wrapper } = await mountEditor();
		await buttonByText(wrapper, 'Add policy').trigger('click');
		await flushPromises();

		expect(wrapper.find('[data-testid="policy-add-form"]').exists()).toBe(true);
		expect(wrapper.findAll('button').some((button) => button.text().endsWith('Add policy'))).toBe(false);
		wrapper.unmount();
	});

	it('closes on Cancel when nothing is pending', async () => {
		const { wrapper, dialogRef } = await mountEditor();
		await buttonByText(wrapper, 'Cancel').trigger('click');
		expect(dialogRef.close).toHaveBeenCalled();
		wrapper.unmount();
	});

	it('asks before discarding an unfinished form row on Escape', async () => {
		const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
		const { wrapper, dialogRef } = await mountEditor();
		await buttonByText(wrapper, 'Add policy').trigger('click');
		await flushPromises();
		const addForm = wrapper.find('[data-testid="policy-add-form"] select');
		(addForm.element as HTMLSelectElement).value = '1';
		await addForm.trigger('change');

		await wrapper.find('dialog').trigger('cancel');
		expect(confirm).toHaveBeenCalledWith('You have an unsaved policy in the form. Discard it and close?');
		expect(dialogRef.close).not.toHaveBeenCalled();

		confirm.mockReturnValue(true);
		await wrapper.find('dialog').trigger('cancel');
		expect(dialogRef.close).toHaveBeenCalled();
		wrapper.unmount();
	});
});
