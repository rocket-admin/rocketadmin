import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api/client';
import { AlertActionType, AlertType } from '@/models/alert';
import { type CompanyMember, CompanyMemberRole } from '@/models/company';
import { SubscriptionPlans } from '@/models/user';
import { useNotificationsStore } from '@/stores/notifications';
import { type FullCompany, useCompanyStore } from './company';

vi.mock('@/api/client', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('@/config', () => ({ getConfig: () => ({ baseURL: '/api', saasURL: 'https://saas.test' }) }));
vi.mock('@/environment', () => ({ environment: { saasHostnames: ['app.rocketadmin.com', 'localhost'] } }));

const get = vi.mocked(api.get);
const post = vi.mocked(api.post);
const put = vi.mocked(api.put);
const del = vi.mocked(api.delete);

const company: FullCompany = {
	id: 'company-1',
	name: 'South Park',
	address: {},
	subscriptionLevel: SubscriptionPlans.team,
	connections: [],
	invitations: [],
};

const member: CompanyMember = {
	id: 'user-1',
	isActive: true,
	name: 'Eric',
	email: 'eric@south.park',
	is_2fa_enabled: false,
	role: CompanyMemberRole.CAO,
	has_groups: true,
	user_membership: [],
};

function routeGets(responses: Record<string, unknown>) {
	get.mockImplementation(async (url: string) => (url in responses ? responses[url] : null) as never);
}

describe('company store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		routeGets({
			'/company/my/full': company,
			'/company/users/company-1': [member],
			'https://saas.test/saas/custom-domain/company-1': { success: false },
		});
	});

	it('tells a customer domain from our own hostnames', () => {
		const store = useCompanyStore();
		expect(store.isCustomDomain('app.rocketadmin.com')).toBe(false);
		expect(store.isCustomDomain('admin.example.com')).toBe(true);
	});

	it('keeps the company and its members', async () => {
		const store = useCompanyStore();

		await store.fetchCompany();
		await store.fetchCompanyMembers('company-1');

		expect(get).toHaveBeenCalledWith('/company/my/full', { notify: 'alert' });
		expect(get).toHaveBeenCalledWith('/company/users/company-1', { notify: 'alert' });
		expect(store.company).toEqual(company);
		expect(store.members).toEqual([member]);
	});

	it('updates the company name', async () => {
		put.mockResolvedValueOnce({});
		await useCompanyStore().updateCompanyName('company-1', 'North Park');
		expect(put).toHaveBeenCalledWith(
			'/company/name/company-1',
			{ name: 'North Park' },
			{ notify: 'snackbar', successMessage: 'Company name has been updated.' },
		);
	});

	it('invites a member (with the Turnstile token only when given) and reloads company and members', async () => {
		put.mockResolvedValue({});
		const store = useCompanyStore();

		await store.inviteCompanyMember('company-1', 'g1', 'kyle@south.park', CompanyMemberRole.Member);
		await store.inviteCompanyMember('company-1', 'g1', 'stan@south.park', CompanyMemberRole.Member, 'turnstile');
		await flushPromises();

		expect(put).toHaveBeenCalledWith(
			'/company/user/company-1',
			{ groupId: 'g1', email: 'kyle@south.park', role: CompanyMemberRole.Member },
			{ notify: 'snackbar', successMessage: 'Invitation link has been sent to kyle@south.park.' },
		);
		expect(put).toHaveBeenCalledWith(
			'/company/user/company-1',
			{ groupId: 'g1', email: 'stan@south.park', role: CompanyMemberRole.Member, turnstileToken: 'turnstile' },
			{ notify: 'snackbar', successMessage: 'Invitation link has been sent to stan@south.park.' },
		);
		expect(store.company).toEqual(company);
		expect(store.members).toEqual([member]);
		expect(store.refreshingMembers).toBe(false);
	});

	it('flags the refresh while it runs', async () => {
		put.mockResolvedValueOnce({});
		const store = useCompanyStore();

		await store.suspendCompanyMember('company-1', ['eric@south.park']);
		expect(store.refreshingMembers).toBe(true);
		await flushPromises();
		expect(store.refreshingMembers).toBe(false);
	});

	it.each([
		['revokeInvitation', () => useCompanyStore().revokeInvitation('company-1', 'kyle@south.park')],
		[
			'updateCompanyMemberRole',
			() => useCompanyStore().updateCompanyMemberRole('company-1', 'u1', CompanyMemberRole.Member),
		],
		['suspendCompanyMember', () => useCompanyStore().suspendCompanyMember('company-1', ['kyle@south.park'])],
		['restoreCompanyMember', () => useCompanyStore().restoreCompanyMember('company-1', ['kyle@south.park'])],
	])('%s reloads the company and its members', async (_name, mutate) => {
		put.mockResolvedValueOnce({});

		await mutate();
		await flushPromises();

		expect(get.mock.calls.map(([url]) => url)).toEqual(['/company/my/full', '/company/users/company-1']);
	});

	it('sends the member changes to the right endpoints', async () => {
		put.mockResolvedValue({});
		const store = useCompanyStore();

		await store.revokeInvitation('company-1', 'kyle@south.park');
		await store.updateCompanyMemberRole('company-1', 'u1', CompanyMemberRole.SystemAdmin);
		await store.suspendCompanyMember('company-1', ['a@b.c']);
		await store.restoreCompanyMember('company-1', ['a@b.c']);

		expect(put.mock.calls).toEqual([
			[
				'/company/invitation/revoke/company-1',
				{ email: 'kyle@south.park' },
				{ notify: 'snackbar', successMessage: 'Invitation has been revoked for kyle@south.park.' },
			],
			[
				'/company/users/roles/company-1',
				{ users: [{ userId: 'u1', role: CompanyMemberRole.SystemAdmin }] },
				{ notify: 'alert', successMessage: 'Company member role has been updated.' },
			],
			[
				'/company/users/suspend/company-1',
				{ usersEmails: ['a@b.c'] },
				{ notify: 'alert', successMessage: 'Company member has been suspended.' },
			],
			[
				'/company/users/unsuspend/company-1',
				{ usersEmails: ['a@b.c'] },
				{ notify: 'alert', successMessage: 'Company member has been restored.' },
			],
		]);
	});

	it('removes a member and reloads only the members', async () => {
		del.mockResolvedValueOnce({});
		const store = useCompanyStore();

		await store.removeCompanyMember('company-1', 'u1', 'kyle@south.park', '');
		await flushPromises();

		expect(del).toHaveBeenCalledWith('/company/company-1/user/u1', {
			notify: 'alert',
			successMessage: 'kyle@south.park has been removed from company.',
		});
		expect(get.mock.calls.map(([url]) => url)).toEqual(['/company/users/company-1']);
	});

	it('does not reload when a mutation fails', async () => {
		put.mockRejectedValueOnce(new Error('nope'));

		await expect(useCompanyStore().suspendCompanyMember('company-1', ['a@b.c'])).rejects.toThrow('nope');
		await flushPromises();
		expect(get).not.toHaveBeenCalled();
	});

	describe('custom domain', () => {
		it('is read from the SaaS API', async () => {
			const store = useCompanyStore();
			await store.getCustomDomain('company-1');

			expect(get).toHaveBeenCalledWith('https://saas.test/saas/custom-domain/company-1', { notify: 'snackbar' });
			expect(store.customDomain).toEqual({ success: false });
		});

		it('shows a success alert with an Open link once registered, then reloads it', async () => {
			post.mockResolvedValueOnce({});
			const store = useCompanyStore();

			await store.createCustomDomain('company-1', 'admin.example.com');
			await flushPromises();

			expect(post).toHaveBeenCalledWith(
				'https://saas.test/saas/custom-domain/register/company-1',
				{ hostname: 'admin.example.com' },
				{ notify: 'snackbar' },
			);
			const alert = useNotificationsStore().alert;
			expect(alert?.type).toBe(AlertType.Success);
			expect(alert?.actions?.[0]).toEqual({
				type: AlertActionType.Anchor,
				caption: 'Open',
				to: 'https://admin.example.com',
			});
			expect(get).toHaveBeenCalledWith('https://saas.test/saas/custom-domain/company-1', { notify: 'snackbar' });
		});

		it('is updated and deleted, reloading it each time', async () => {
			put.mockResolvedValueOnce({});
			del.mockResolvedValueOnce({});
			const store = useCompanyStore();

			await store.updateCustomDomain('company-1', 'new.example.com');
			await store.deleteCustomDomain('company-1');
			await flushPromises();

			expect(put).toHaveBeenCalledWith(
				'https://saas.test/saas/custom-domain/update/company-1',
				{ hostname: 'new.example.com' },
				{ notify: 'snackbar', successMessage: 'Custom domain has been updated.' },
			);
			expect(del).toHaveBeenCalledWith('https://saas.test/saas/custom-domain/delete/company-1', {
				notify: 'snackbar',
				successMessage: 'Custom domain has been removed.',
			});
			expect(get).toHaveBeenCalledTimes(2);
		});
	});
});
