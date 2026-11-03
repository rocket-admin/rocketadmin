import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDialogsStore } from '@/composables/useDialog';
import AccountDeleteConfirmationDialog from './AccountDeleteConfirmationDialog.vue';
import AccountDeleteDialog from './AccountDeleteDialog.vue';
import { openDialog } from './dialogTestUtils';

vi.mock('@/stores/user', () => ({ useUserStore: () => ({ deleteAccount: vi.fn() }) }));
vi.mock('@/components/auth/analytics', () => ({ trackAuthEvent: vi.fn() }));

let wrapper: VueWrapper;

describe('AccountDeleteDialog', () => {
	afterEach(() => wrapper.unmount());

	it('shows the advice for the chosen reason', async () => {
		({ wrapper } = await openDialog(AccountDeleteDialog, { email: 'user@test.com' }));
		expect(wrapper.find('h2').text()).toBe('Delete user@test.com account');
		expect(wrapper.text()).not.toContain('Support team');

		const radios = wrapper.findAll('input[type="radio"]');
		expect(radios).toHaveLength(5);
		await radios[2]?.setValue(true);
		expect(wrapper.find('a').attributes('href')).toBe(
			'https://help.rocketadmin.com/comparisons-with-other-database-admin-tools',
		);
	});

	it('opens the confirmation with the reason and message and closes itself', async () => {
		const opened = await openDialog(AccountDeleteDialog, { email: 'user@test.com' });
		wrapper = opened.wrapper;
		await wrapper.findAll('input[type="radio"]')[1]?.setValue(true);
		await wrapper.find('textarea').setValue('I cannot add connection');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		await expect(opened.dialogRef.afterClosed()).resolves.toBeUndefined();
		const entries = useDialogsStore().entries;
		expect(entries).toHaveLength(1);
		expect(entries[0]?.component).toBe(AccountDeleteConfirmationDialog);
		expect(entries[0]?.data).toEqual({ reason: 'technical-issues', message: 'I cannot add connection' });
	});
});
