import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupAddDialog from './GroupAddDialog.vue';
import GroupDeleteDialog from './GroupDeleteDialog.vue';
import GroupNameEditDialog from './GroupNameEditDialog.vue';
import { buttonByText, mountDialog } from './testUtils';
import UserDeleteDialog from './UserDeleteDialog.vue';

const users = vi.hoisted(() => ({
	createGroup: vi.fn(),
	deleteGroup: vi.fn(),
	editGroupName: vi.fn(),
	deleteGroupUser: vi.fn(),
}));
const analytics = vi.hoisted(() => ({ trackUsersEvent: vi.fn() }));

vi.mock('@/stores/users', () => ({ useUsersStore: () => users }));
vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => ({ connectionID: '12345678' }) }));
vi.mock('./analytics', () => analytics);

describe('GroupAddDialog', () => {
	beforeEach(() => vi.clearAllMocks());

	it('creates the group in the current connection and closes with it', async () => {
		users.createGroup.mockResolvedValue({ id: 'new-group', title: 'Sellers' });
		const { wrapper, dialogRef } = await mountDialog(GroupAddDialog);

		expect(buttonByText(wrapper, 'Create').attributes('disabled')).toBeDefined();
		await wrapper.find('[data-testid="group-title-input"]').setValue('Sellers');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(users.createGroup).toHaveBeenCalledWith('12345678', 'Sellers');
		expect(dialogRef.close).toHaveBeenCalledWith({ id: 'new-group', title: 'Sellers' });
		expect(analytics.trackUsersEvent).toHaveBeenCalledWith('User groups: user groups was created successfully');
		expect(buttonByText(wrapper, 'Create').attributes('disabled')).toBeUndefined();
		wrapper.unmount();
	});

	it('shows the required error once the title is touched', async () => {
		const { wrapper } = await mountDialog(GroupAddDialog);
		await wrapper.find('[data-testid="group-title-input"]').trigger('blur');
		expect(wrapper.text()).toContain('Title should not be empty.');
		wrapper.unmount();
	});

	it('stays open when creating fails', async () => {
		users.createGroup.mockRejectedValue(new Error('boom'));
		const { wrapper, dialogRef } = await mountDialog(GroupAddDialog);

		await wrapper.find('[data-testid="group-title-input"]').setValue('Sellers');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(dialogRef.close).not.toHaveBeenCalled();
		expect(buttonByText(wrapper, 'Create').attributes('disabled')).toBeUndefined();
		wrapper.unmount();
	});
});

describe('GroupDeleteDialog', () => {
	beforeEach(() => vi.clearAllMocks());

	it('names the group and deletes it on confirm', async () => {
		users.deleteGroup.mockResolvedValue(undefined);
		const { wrapper, dialogRef } = await mountDialog(GroupDeleteDialog, { id: '12345678-123', title: 'Test' });

		expect(wrapper.text()).toContain('You are going to delete Test group.');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(users.deleteGroup).toHaveBeenCalledWith('12345678-123');
		expect(dialogRef.close).toHaveBeenCalled();
		expect(analytics.trackUsersEvent).toHaveBeenCalledWith('User groups: user group was deleted successfully');
		wrapper.unmount();
	});
});

describe('GroupNameEditDialog', () => {
	beforeEach(() => vi.clearAllMocks());

	it('starts from the current name and renames the group', async () => {
		users.editGroupName.mockResolvedValue(undefined);
		const { wrapper, dialogRef } = await mountDialog(GroupNameEditDialog, { id: 'test-id', title: 'Test Group' });

		const input = wrapper.find('input');
		expect((input.element as HTMLInputElement).value).toBe('Test Group');
		await input.setValue('Renamed');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(users.editGroupName).toHaveBeenCalledWith('test-id', 'Renamed');
		expect(dialogRef.close).toHaveBeenCalled();
		wrapper.unmount();
	});

	it('disables Change while the name is empty', async () => {
		const { wrapper } = await mountDialog(GroupNameEditDialog, { id: 'test-id', title: 'Test Group' });
		await wrapper.find('input').setValue('');
		expect(buttonByText(wrapper, 'Change').attributes('disabled')).toBeDefined();
		wrapper.unmount();
	});
});

describe('UserDeleteDialog', () => {
	beforeEach(() => vi.clearAllMocks());

	it('removes the user from the group', async () => {
		users.deleteGroupUser.mockResolvedValue(undefined);
		const { wrapper, dialogRef } = await mountDialog(UserDeleteDialog, {
			user: { email: 'user@test.com' },
			group: { id: '12345678-123', title: 'Sellers' },
		});

		expect(wrapper.text()).toContain('You are going to delete user@test.com from Sellers group.');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(users.deleteGroupUser).toHaveBeenCalledWith('user@test.com', '12345678-123');
		expect(dialogRef.close).toHaveBeenCalled();
		wrapper.unmount();
	});

	it('shows the name with the email when the user has one', async () => {
		const { wrapper } = await mountDialog(UserDeleteDialog, {
			user: { email: 'ann@test.com', name: 'Ann' },
			group: { id: 'g', title: 'Sellers' },
		});
		expect(wrapper.text()).toContain('Ann (ann@test.com)');
		wrapper.unmount();
	});
});
