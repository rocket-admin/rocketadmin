import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, reactive } from 'vue';
import { vTooltip } from '@/components/ui';
import CedarPolicyEditorDialog from '@/components/users/CedarPolicyEditorDialog.vue';
import GroupAddDialog from '@/components/users/GroupAddDialog.vue';
import GroupDeleteDialog from '@/components/users/GroupDeleteDialog.vue';
import GroupNameEditDialog from '@/components/users/GroupNameEditDialog.vue';
import { createTestRouter } from '@/components/users/testUtils';
import UserAddDialog from '@/components/users/UserAddDialog.vue';
import UserDeleteDialog from '@/components/users/UserDeleteDialog.vue';
import type { GroupUser, UserGroupInfo } from '@/models/user';
import PermissionsView from './PermissionsView.vue';

const { users, dialog, company, permissions, analytics } = vi.hoisted(() => ({
	users: {
		groups: [] as UserGroupInfo[],
		groupsLoading: false,
		groupUsers: {} as Record<string, GroupUser[] | 'empty'>,
		fetchAllGroupUsers: vi.fn(),
	},
	dialog: { open: vi.fn(), closeAll: vi.fn() },
	company: { fetchCompanyMembers: vi.fn() },
	permissions: { allowed: true },
	analytics: { trackUsersEvent: vi.fn() },
}));

const usersState = reactive(users);
const permissionState = reactive(permissions);
const userState = reactive({ currentUser: { email: 'me@test.com', company: { id: 'company-1' } } });

vi.mock('@/stores/users', () => ({ useUsersStore: () => usersState }));
vi.mock('@/stores/user', () => ({ useUserStore: () => userState }));
vi.mock('@/stores/company', () => ({ useCompanyStore: () => company }));
vi.mock('@/stores/connections', () => ({
	useConnectionsStore: () => ({ connectionID: 'conn-1', connectionTitle: 'Shop DB' }),
}));
vi.mock('@/stores/cedar-permissions', () => ({
	useCedarPermissionsStore: () => ({ canI: () => computed(() => permissionState.allowed) }),
}));
vi.mock('@/composables/useDialog', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/composables/useDialog')>()),
	useDialog: () => dialog,
}));
vi.mock('@/components/users/analytics', () => analytics);

const adminGroup = { id: 'admin-id', title: 'Admin', isMain: true };
const sellersGroup = {
	id: 'sellers-id',
	title: 'Sellers',
	isMain: false,
	cedarPolicy: 'permit(principal, action, resource);',
};

const me: GroupUser = {
	id: 'u-1',
	createdAt: '',
	gclid: null,
	isActive: true,
	email: 'me@test.com',
	name: 'Me Myself',
};
const ann: GroupUser = { id: 'u-2', createdAt: '', gclid: null, isActive: true, email: 'ann@test.com' };

const members = [
	{ id: 'u-1', email: 'me@test.com', name: 'Me Myself' },
	{ id: 'u-2', email: 'ann@test.com', name: 'Ann' },
	{ id: 'u-3', email: 'bob@test.com', name: 'Bob' },
];

async function mountView(): Promise<VueWrapper> {
	const router = createTestRouter();
	await router.push('/permissions/conn-1');
	const wrapper = mount(PermissionsView, {
		global: {
			plugins: [router],
			directives: { tooltip: vTooltip },
			stubs: { PublicAccessPanel: { template: '<div data-testid="public-access-panel" />' } },
		},
	});
	await flushPromises();
	return wrapper;
}

function group(wrapper: VueWrapper, title: string) {
	const match = wrapper
		.findAll('[data-testid="user-group"]')
		.find((candidate) => candidate.find('.permissions__group-title').text().startsWith(title));
	if (!match) throw new Error(`No group ${title}`);
	return match;
}

async function click(wrapper: VueWrapper, groupTitle: string, label: string) {
	await group(wrapper, groupTitle).find(`[aria-label="${label}"]`).trigger('click');
	await flushPromises();
}

describe('PermissionsView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		usersState.groups = [
			{ group: adminGroup, accessLevel: 'edit' },
			{ group: sellersGroup, accessLevel: 'edit' },
		];
		usersState.groupsLoading = false;
		usersState.groupUsers = { 'admin-id': [me], 'sellers-id': [ann] };
		permissionState.allowed = true;
		company.fetchCompanyMembers.mockResolvedValue(members);
		dialog.open.mockReturnValue({ afterClosed: () => Promise.resolve(undefined) });
	});

	it('sets the page title with the connection title', async () => {
		const wrapper = await mountView();
		expect(document.title).toBe('User permissions - Shop DB | Rocketadmin');
		wrapper.unmount();
	});

	it('fetches the members of every group and of the company', async () => {
		const wrapper = await mountView();
		expect(usersState.fetchAllGroupUsers).toHaveBeenCalledWith(usersState.groups);
		expect(company.fetchCompanyMembers).toHaveBeenCalledWith('company-1');
		wrapper.unmount();
	});

	it('shows the skeleton while the first group list loads', async () => {
		usersState.groups = [];
		usersState.groupsLoading = true;
		const wrapper = await mountView();
		expect(wrapper.find('[aria-label="Loading user groups"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="user-group"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('renders the groups with their members, the system badge and the member count', async () => {
		const wrapper = await mountView();
		const admin = group(wrapper, 'Admin');
		expect(admin.text()).toContain('system');
		expect(admin.find('.permissions__avatar').text()).toBe('MM');
		expect(admin.find('.permissions__members-count').text()).toBe('1 member');
		expect(group(wrapper, 'Sellers').find('.permissions__avatar').text()).toBe('A');
		expect(group(wrapper, 'Sellers').text()).toContain('ann@test.com');
		wrapper.unmount();
	});

	it('shows the loading and empty states of a group members', async () => {
		usersState.groupUsers = { 'sellers-id': 'empty' };
		const wrapper = await mountView();
		expect(group(wrapper, 'Admin').find('[aria-label="Loading group members"]').exists()).toBe(true);
		expect(group(wrapper, 'Sellers').text()).toContain('No users in the group');
		wrapper.unmount();
	});

	it('hides the edit, policy and delete actions of the Admin group', async () => {
		const wrapper = await mountView();
		const admin = group(wrapper, 'Admin');
		expect(admin.find('[aria-label="Edit group name"]').exists()).toBe(false);
		expect(admin.find('[aria-label="Edit policy"]').exists()).toBe(false);
		expect(admin.find('[aria-label="Delete group"]').exists()).toBe(false);
		expect(admin.find('[aria-label="Add user"]').exists()).toBe(true);
		wrapper.unmount();
	});

	it('does not offer to remove the signed-in user', async () => {
		const wrapper = await mountView();
		expect(group(wrapper, 'Admin').find('[aria-label="Delete user"]').exists()).toBe(false);
		expect(group(wrapper, 'Sellers').find('[aria-label="Delete user"]').exists()).toBe(true);
		wrapper.unmount();
	});

	it('hides management for users who cannot edit groups', async () => {
		permissionState.allowed = false;
		const wrapper = await mountView();
		expect(wrapper.text()).not.toContain('New group');
		expect(wrapper.find('[data-testid="public-access-panel"]').exists()).toBe(false);
		expect(wrapper.find('[aria-label="Add user"]').exists()).toBe(false);
		expect(wrapper.find('[aria-label="View as group (opens in new tab)"]').exists()).toBe(true);
		wrapper.unmount();
	});

	it('shows the public access panel to connection editors', async () => {
		const wrapper = await mountView();
		expect(wrapper.find('[data-testid="public-access-panel"]').exists()).toBe(true);
		wrapper.unmount();
	});

	it('links "view as" to the page with the group in a new tab', async () => {
		const wrapper = await mountView();
		const link = group(wrapper, 'Sellers').find('[aria-label="View as group (opens in new tab)"]');
		expect(link.attributes('href')).toBe('/permissions/conn-1?viewAs=sellers-id');
		expect(link.attributes('target')).toBe('_blank');
		wrapper.unmount();
	});

	it('lists company members without access', async () => {
		const wrapper = await mountView();
		const text = wrapper.find('[data-testid="members-without-access"]').text();
		expect(text).toContain('Company members who do NOT have access to this connection:');
		expect(text).toContain('Bob (bob@test.com)');
		expect(text).not.toContain('ann@test.com');
		wrapper.unmount();
	});

	it('opens the policy editor for a created group', async () => {
		const created = { id: 'new-id', title: 'Support' };
		dialog.open.mockReturnValueOnce({ afterClosed: () => Promise.resolve(created) });
		const wrapper = await mountView();

		const button = wrapper.findAll('button').find((candidate) => candidate.text() === 'New group');
		await button?.trigger('click');
		await flushPromises();

		expect(dialog.open).toHaveBeenNthCalledWith(1, GroupAddDialog);
		expect(dialog.open).toHaveBeenNthCalledWith(2, CedarPolicyEditorDialog, {
			data: { groupId: 'new-id', groupTitle: 'Support', cedarPolicy: null },
		});
		expect(analytics.trackUsersEvent).toHaveBeenCalledWith('Users access: add group is clicked');
		wrapper.unmount();
	});

	it('opens the add user dialog with the members not in the group', async () => {
		const wrapper = await mountView();
		await click(wrapper, 'Sellers', 'Add user');

		expect(dialog.open).toHaveBeenCalledWith(UserAddDialog, {
			data: { group: sellersGroup, availableMembers: [members[0], members[2]] },
		});
		wrapper.unmount();
	});

	it('opens the policy, rename, delete group and delete user dialogs', async () => {
		const wrapper = await mountView();

		await click(wrapper, 'Sellers', 'Edit policy');
		expect(dialog.open).toHaveBeenLastCalledWith(CedarPolicyEditorDialog, {
			data: { groupId: 'sellers-id', groupTitle: 'Sellers', cedarPolicy: sellersGroup.cedarPolicy },
		});

		await click(wrapper, 'Sellers', 'Edit group name');
		expect(dialog.open).toHaveBeenLastCalledWith(GroupNameEditDialog, { data: sellersGroup });

		await click(wrapper, 'Sellers', 'Delete group');
		expect(dialog.open).toHaveBeenLastCalledWith(GroupDeleteDialog, { data: sellersGroup });

		await click(wrapper, 'Sellers', 'Delete user');
		expect(dialog.open).toHaveBeenLastCalledWith(UserDeleteDialog, { data: { user: ann, group: sellersGroup } });
		wrapper.unmount();
	});

	it('starts every group expanded and lets it collapse', async () => {
		const wrapper = await mountView();
		const toggle = group(wrapper, 'Sellers').find('.ui-expansion-panel__toggle');
		expect(toggle.attributes('aria-expanded')).toBe('true');
		await toggle.trigger('click');
		expect(group(wrapper, 'Sellers').find('.ui-expansion-panel__toggle').attributes('aria-expanded')).toBe('false');
		wrapper.unmount();
	});
});
