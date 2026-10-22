import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buttonByText, mountDialog, selectOption } from './testUtils';
import UserAddDialog from './UserAddDialog.vue';

const users = vi.hoisted(() => ({ addGroupUser: vi.fn() }));
const analytics = vi.hoisted(() => ({ trackUsersEvent: vi.fn() }));

vi.mock('@/stores/users', () => ({ useUsersStore: () => users }));
vi.mock('./analytics', () => analytics);

const fakeMembers = [
	{ id: 'user-1', email: 'alice@test.com', name: 'Alice Smith' },
	{ id: 'user-2', email: 'bob@test.com', name: 'Bob Jones' },
	{ id: 'user-3', email: 'charlie@test.com', name: '' },
];

const fakeGroup = { id: '12345678-abcd-1234-efgh-123456789012', title: 'Developers' };

describe('UserAddDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		users.addGroupUser.mockResolvedValue(undefined);
	});

	describe('with available members', () => {
		const mountPage = () => mountDialog(UserAddDialog, { availableMembers: fakeMembers, group: fakeGroup });

		it('shows the group title, the member picker and the Company hint', async () => {
			const { wrapper } = await mountPage();

			expect(wrapper.find('h2').text()).toContain('Developers');
			const labels = wrapper.findAll('option').map((option) => option.text());
			expect(labels).toEqual([
				'Select user',
				'Alice Smith (alice@test.com)',
				'Bob Jones (bob@test.com)',
				'charlie@test.com',
			]);
			expect(wrapper.text()).toContain('Add users to the');
			expect(wrapper.text()).not.toContain('All your company members are already in this group');
			expect(wrapper.findAll('a').some((link) => link.text() === 'Open Company page')).toBe(false);
			wrapper.unmount();
		});

		it('disables Add (a submit button) until a user is selected', async () => {
			const { wrapper } = await mountPage();

			const add = buttonByText(wrapper, 'Add');
			expect(add.attributes('type')).toBe('submit');
			expect(add.attributes('disabled')).toBeDefined();
			await selectOption(wrapper, 'Bob Jones (bob@test.com)');
			expect(buttonByText(wrapper, 'Add').attributes('disabled')).toBeUndefined();
			wrapper.unmount();
		});

		it('adds the selected member to the group and closes', async () => {
			const { wrapper, dialogRef } = await mountPage();

			await selectOption(wrapper, 'Alice Smith (alice@test.com)');
			await wrapper.find('form').trigger('submit');
			await flushPromises();

			expect(users.addGroupUser).toHaveBeenCalledWith('12345678-abcd-1234-efgh-123456789012', 'alice@test.com');
			expect(dialogRef.close).toHaveBeenCalled();
			expect(analytics.trackUsersEvent).toHaveBeenCalledWith('User groups: user was added to group successfully');
			expect(buttonByText(wrapper, 'Add').attributes('disabled')).toBeUndefined();
			wrapper.unmount();
		});

		it('stays open when adding fails', async () => {
			users.addGroupUser.mockRejectedValueOnce(new Error('Network error'));
			const { wrapper, dialogRef } = await mountPage();

			await selectOption(wrapper, 'Alice Smith (alice@test.com)');
			await wrapper.find('form').trigger('submit');
			await flushPromises();

			expect(dialogRef.close).not.toHaveBeenCalled();
			expect(buttonByText(wrapper, 'Add').attributes('disabled')).toBeUndefined();
			wrapper.unmount();
		});
	});

	describe('with no available members', () => {
		const mountPage = () => mountDialog(UserAddDialog, { availableMembers: [], group: fakeGroup });

		it('explains why and links to the Company page instead of a picker', async () => {
			const { wrapper } = await mountPage();

			expect(wrapper.text()).toContain('All your company members are already in this group');
			expect(wrapper.find('select').exists()).toBe(false);
			expect(wrapper.findAll('button').some((button) => button.text() === 'Add')).toBe(false);
			const link = wrapper.findAll('a').find((candidate) => candidate.text() === 'Open Company page');
			expect(link?.attributes('href')).toBe('/company');
			wrapper.unmount();
		});

		it('closes when the Company page is opened', async () => {
			const { wrapper, dialogRef, router } = await mountPage();

			const link = wrapper.findAll('a').find((candidate) => candidate.text() === 'Open Company page');
			await link?.trigger('click');
			await flushPromises();

			expect(dialogRef.close).toHaveBeenCalled();
			expect(router.currentRoute.value.path).toBe('/company');
			wrapper.unmount();
		});
	});
});
