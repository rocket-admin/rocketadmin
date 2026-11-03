import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import DeleteMemberDialog from '@/components/company/DeleteMemberDialog.vue';
import InviteMemberDialog from '@/components/company/InviteMemberDialog.vue';
import RevokeInvitationDialog from '@/components/company/RevokeInvitationDialog.vue';
import { type Company, type CompanyMember, CompanyMemberRole } from '@/models/company';
import { SubscriptionPlans } from '@/models/user';
import { buttonByText, mountAuthView } from '@/views/auth/authTestUtils';
import CompanyView from './CompanyView.vue';

const company = vi.hoisted(() => ({
	company: null as unknown,
	members: [] as unknown[],
	refreshingMembers: false,
	isCustomDomain: vi.fn(() => false),
	fetchCompany: vi.fn(),
	fetchCompanyMembers: vi.fn(),
	getCustomDomain: vi.fn(),
	updateCompanyName: vi.fn(),
	updateCompanyMemberRole: vi.fn(),
	suspendCompanyMember: vi.fn(),
	restoreCompanyMember: vi.fn(),
}));
const user = vi.hoisted(() => ({ currentUser: null as { email: string } | null, fetchUser: vi.fn() }));
const open = vi.hoisted(() => vi.fn());
const trackAuthEvent = vi.hoisted(() => vi.fn());

vi.mock('@/stores/company', () => ({ useCompanyStore: () => reactive(company) }));
vi.mock('@/stores/user', () => ({ useUserStore: () => reactive(user) }));
vi.mock('@/stores/ui-settings', () => ({
	useUiSettingsStore: () => ({ getUiSettings: () => Promise.resolve(null), updateGlobalSetting: vi.fn() }),
}));
vi.mock('@/composables/useDialog', () => ({ useDialog: () => ({ open }) }));
vi.mock('@/components/auth/analytics', () => ({ trackAuthEvent }));

const mockCompany: Company = {
	id: 'company-12345678',
	name: 'My company',
	subscriptionLevel: SubscriptionPlans.free,
	address: {},
	connections: [],
	invitations: [
		{
			id: 'invitation1',
			verification_string: 'verification_string_12345678',
			groupId: '',
			inviterId: 'user1',
			invitedUserEmail: 'admin1@test.com',
			role: CompanyMemberRole.CAO,
		},
	],
};

function member(overrides: Partial<CompanyMember>): CompanyMember {
	return {
		id: 'id',
		isActive: true,
		email: 'x@test.com',
		name: '',
		is_2fa_enabled: false,
		role: CompanyMemberRole.Member,
		has_groups: false,
		user_membership: [],
		...overrides,
	};
}

const mockMembers = [
	member({ id: '61582cb5', email: 'user1@test.com', name: 'User 3333', role: CompanyMemberRole.Member }),
	member({ id: 'a06ee7bf', email: 'admin0@test.com', role: CompanyMemberRole.CAO, isActive: false }),
];

const mountPage = () => mountAuthView(CompanyView, '/company');

describe('CompanyView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		company.company = null;
		company.members = [];
		company.refreshingMembers = false;
		// Through the reactive proxy, so the page sees the store state change.
		company.fetchCompany.mockImplementation(() => {
			const fresh = structuredClone(mockCompany);
			reactive(company).company = fresh;
			return Promise.resolve(fresh);
		});
		company.fetchCompanyMembers.mockImplementation(() => {
			reactive(company).members = mockMembers;
			return Promise.resolve(mockMembers);
		});
		company.getCustomDomain.mockResolvedValue({ success: false });
		company.updateCompanyName.mockResolvedValue(undefined);
		company.updateCompanyMemberRole.mockResolvedValue({});
		company.suspendCompanyMember.mockResolvedValue({});
		user.currentUser = { email: 'admin0@test.com' };
	});

	it('loads the company, then its members and custom domain', async () => {
		const { wrapper } = await mountPage();

		expect(company.fetchCompany).toHaveBeenCalled();
		expect(company.fetchCompanyMembers).toHaveBeenCalledWith('company-12345678');
		expect(company.getCustomDomain).toHaveBeenCalledWith('company-12345678');
		expect(document.title).toBe('Company settings | Rocketadmin');
		expect(wrapper.text()).toContain('My company company settings');
		wrapper.unmount();
	});

	it('lists the account owner first, then the other members, then the invitations', async () => {
		const { wrapper } = await mountPage();

		const emails = wrapper.findAll('[data-testid^="company-member-email-"]').map((cell) => cell.text());
		expect(emails).toEqual(['admin0@test.com', 'user1@test.com', 'admin1@test.com']);
		expect(wrapper.find('[data-testid="company-member-name-1-cell"]').text()).toBe('User 3333');
		expect(wrapper.find('[data-testid="company-member-name-0-cell"]').text()).toBe('—');
		// The invitation row offers Revoke; the only owner cannot be deleted.
		expect(wrapper.find('[data-testid="company-member-revoke-2-button"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="company-member-delete-0-button"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="company-member-delete-1-button"]').exists()).toBe(true);
		wrapper.unmount();
	});

	it('shows the role as text for the only owner and as a menu for other members', async () => {
		const { wrapper } = await mountPage();

		expect(wrapper.find('[data-testid="company-member-user-role-0-cell"]').text()).toBe('Account Owner');
		expect(wrapper.find('[data-testid="company-member-role-1-menu"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="company-member-user-role-2-cell"]').text()).toBe('Account Owner');
		wrapper.unmount();
	});

	it('hides admin controls from members', async () => {
		user.currentUser = { email: 'user1@test.com' };
		const { wrapper } = await mountPage();

		expect(wrapper.find('[data-testid="company-name-input"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="company-invitation-button"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid^="company-member-active-"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid^="company-member-delete-"]').exists()).toBe(false);
		expect(wrapper.findAll('th').map((th) => th.text())).toEqual(['Email', 'Name', 'Role', '2fa', 'Access']);
		wrapper.unmount();
	});

	it('opens the invite dialog with the company', async () => {
		const { wrapper } = await mountPage();

		await wrapper.find('[data-testid="company-invitation-button"]').trigger('click');
		expect(open).toHaveBeenCalledWith(InviteMemberDialog, { data: expect.objectContaining({ id: mockCompany.id }) });
		expect(trackAuthEvent).toHaveBeenCalledWith('Company: invite member is clicked');
		wrapper.unmount();
	});

	it('opens the delete member dialog with the company id and member', async () => {
		const { wrapper } = await mountPage();

		await wrapper.find('[data-testid="company-member-delete-1-button"]').trigger('click');
		expect(open).toHaveBeenCalledWith(DeleteMemberDialog, {
			data: { companyId: 'company-12345678', user: { id: '61582cb5', email: 'user1@test.com', name: 'User 3333' } },
		});
		wrapper.unmount();
	});

	it('opens the revoke invitation dialog with the company id and email', async () => {
		const { wrapper } = await mountPage();

		await wrapper.find('[data-testid="company-member-revoke-2-button"]').trigger('click');
		expect(open).toHaveBeenCalledWith(RevokeInvitationDialog, {
			data: { companyId: 'company-12345678', userEmail: 'admin1@test.com' },
		});
		wrapper.unmount();
	});

	it('saves the company name once it was edited', async () => {
		const { wrapper } = await mountPage();
		expect(buttonByText(wrapper, 'Save').attributes('disabled')).toBeDefined();

		await wrapper.find('[data-testid="company-name-input"]').setValue('New company name');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(company.updateCompanyName).toHaveBeenCalledWith('company-12345678', 'New company name');
		expect(trackAuthEvent).toHaveBeenCalledWith('Company: company name is updated successfully');
		wrapper.unmount();
	});

	it('updates a member role from the role menu', async () => {
		const { wrapper } = await mountPage();

		const menu = wrapper.find('[data-testid="company-member-role-1-menu"]');
		const ownerItem = menu.findAll('[role="menuitem"]').find((item) => item.text().startsWith('Account Owner'));
		await ownerItem?.trigger('click');
		await flushPromises();

		expect(company.updateCompanyMemberRole).toHaveBeenCalledWith('company-12345678', '61582cb5', 'ADMIN');
		expect(trackAuthEvent).toHaveBeenCalledWith('Company: role is updated successfully');
		wrapper.unmount();
	});

	it('suspends a member from the toggle; the last active owner cannot suspend themselves', async () => {
		const { wrapper } = await mountPage();

		expect(wrapper.find('[data-testid="company-member-active-0-toggle"]').attributes('disabled')).toBeDefined();
		await wrapper.find('[data-testid="company-member-active-1-toggle"]').setValue(true);
		await flushPromises();

		expect(company.suspendCompanyMember).toHaveBeenCalledWith('company-12345678', ['user1@test.com']);
		expect(trackAuthEvent).toHaveBeenCalledWith('Company: member is suspended');
		wrapper.unmount();
	});

	it('shows the table placeholder while members are refreshed', async () => {
		const { wrapper } = await mountPage();
		reactive(company).refreshingMembers = true;
		await flushPromises();

		expect(wrapper.find('table').exists()).toBe(false);
		expect(wrapper.find('[role="status"]').exists()).toBe(true);
		wrapper.unmount();
	});
});
