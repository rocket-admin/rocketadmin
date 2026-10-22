import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buttonByText, isOpen, openDialog } from '@/components/user-settings/dialogTestUtils';
import { environment } from '@/environment';
import type { CompanyConnection } from '@/models/company';
import InviteMemberDialog from './InviteMemberDialog.vue';

const store = vi.hoisted(() => ({ inviteCompanyMember: vi.fn() }));
const trackAuthEvent = vi.hoisted(() => vi.fn());
const turnstileReset = vi.hoisted(() => vi.fn());
vi.mock('@/stores/company', () => ({ useCompanyStore: () => store }));
vi.mock('@/components/auth/analytics', () => ({ trackAuthEvent }));
vi.mock('@/components/auth/TurnstileWidget.vue', async () => {
	const { defineComponent, h } = await import('vue');
	return {
		default: defineComponent({
			emits: ['token-received', 'token-error', 'token-expired'],
			setup(_props, { emit, expose }) {
				expose({ reset: turnstileReset });
				return () =>
					h('button', { type: 'button', 'data-testid': 'turnstile', onClick: () => emit('token-received', 'tok') });
			},
		}),
	};
});

let wrapper: VueWrapper;

function connection(title: string, isTestConnection: boolean, groups: { id: string; title: string }[]) {
	return { id: title, title, isTestConnection, groups } as unknown as CompanyConnection;
}

const company = {
	id: 'company-1',
	name: 'Acme',
	connections: [
		connection('Test DB', true, [{ id: 'group-3', title: 'Testers' }]),
		connection('Production DB', false, [
			{ id: 'group-1', title: 'Admins' },
			{ id: 'group-2', title: 'Readers' },
		]),
	],
};

async function mountDialog() {
	const opened = await openDialog<void>(InviteMemberDialog, company);
	wrapper = opened.wrapper;
	return opened.dialogRef;
}

describe('InviteMemberDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		environment.saas = false;
		store.inviteCompanyMember.mockResolvedValue(undefined);
	});

	afterEach(() => wrapper.unmount());

	it('lists the groups by connection, test connections last', async () => {
		await mountDialog();
		expect(wrapper.find('h2').text()).toBe('Add member to Acme company');
		expect(wrapper.findAll('optgroup').map((group) => group.attributes('label'))).toEqual(['Production DB', 'Test DB']);
		expect(wrapper.findAll('option').map((option) => option.text())).toEqual([
			'-- None --',
			'Admins',
			'Readers',
			'Testers',
		]);
	});

	it('requires a valid email', async () => {
		await mountDialog();
		const add = () => buttonByText(wrapper, 'Add');
		expect(add().attributes('disabled')).toBeDefined();

		await wrapper.find('input[name="email"]').setValue('not-an-email');
		expect(wrapper.text()).toContain('Invalid email format.');
		expect(add().attributes('disabled')).toBeDefined();
	});

	it('invites the member with the chosen role and group, then closes', async () => {
		const dialogRef = await mountDialog();
		await wrapper.find('input[name="email"]').setValue('kenny@test.com');
		const systemAdmin = wrapper.findAll('[role="menuitem"]').find((item) => item.text().startsWith('System Admin'));
		await systemAdmin?.trigger('click');
		await wrapper.find('select').setValue('1');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(store.inviteCompanyMember).toHaveBeenCalledWith(
			'company-1',
			'group-2',
			'kenny@test.com',
			'DB_ADMIN',
			undefined,
		);
		expect(trackAuthEvent).toHaveBeenCalledWith('Company: member is invited successfully');
		await expect(dialogRef.afterClosed()).resolves.toBeUndefined();
		expect(isOpen(wrapper)).toBe(false);
	});

	it('defaults to the Member role and no group', async () => {
		await mountDialog();
		await wrapper.find('input[name="email"]').setValue('kenny@test.com');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(store.inviteCompanyMember).toHaveBeenCalledWith('company-1', '', 'kenny@test.com', 'USER', undefined);
	});

	it('on SaaS waits for a Turnstile token, sends it, and resets the widget after a failure', async () => {
		environment.saas = true;
		store.inviteCompanyMember.mockRejectedValue(new Error('nope'));
		await mountDialog();
		await wrapper.find('input[name="email"]').setValue('kenny@test.com');
		expect(buttonByText(wrapper, 'Add').attributes('disabled')).toBeDefined();

		await wrapper.find('[data-testid="turnstile"]').trigger('click');
		expect(buttonByText(wrapper, 'Add').attributes('disabled')).toBeUndefined();
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(store.inviteCompanyMember).toHaveBeenCalledWith('company-1', '', 'kenny@test.com', 'USER', 'tok');
		expect(turnstileReset).toHaveBeenCalled();
		expect(buttonByText(wrapper, 'Add').attributes('disabled')).toBeDefined();
		expect(isOpen(wrapper)).toBe(true);
	});
});
