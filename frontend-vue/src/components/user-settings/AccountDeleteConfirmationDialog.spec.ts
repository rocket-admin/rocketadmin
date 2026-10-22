import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AccountDeleteConfirmationDialog from './AccountDeleteConfirmationDialog.vue';
import { buttonByText, isOpen, openDialog } from './dialogTestUtils';

const store = vi.hoisted(() => ({ deleteAccount: vi.fn() }));
const trackAuthEvent = vi.hoisted(() => vi.fn());
vi.mock('@/stores/user', () => ({ useUserStore: () => store }));
vi.mock('@/components/auth/analytics', () => ({ trackAuthEvent }));

let wrapper: VueWrapper;
const metadata = { reason: 'technical-issues', message: 'I cannot add connection' };

describe('AccountDeleteConfirmationDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		store.deleteAccount.mockResolvedValue(undefined);
	});

	afterEach(() => wrapper.unmount());

	it('deletes the account with the survey answers, tracks it and closes', async () => {
		const opened = await openDialog(AccountDeleteConfirmationDialog, metadata);
		wrapper = opened.wrapper;
		expect(wrapper.find('h2').text()).toBe('Are you sure?');

		await buttonByText(wrapper, 'Yes, delete').trigger('click');
		await flushPromises();

		expect(store.deleteAccount).toHaveBeenCalledWith(metadata);
		expect(trackAuthEvent).toHaveBeenCalledWith('Delete account', {
			email: undefined,
			reason: 'technical-issues',
			message: 'I cannot add connection',
		});
		expect(isOpen(wrapper)).toBe(false);
	});

	it('stays open when the deletion fails', async () => {
		store.deleteAccount.mockRejectedValue(new Error('nope'));
		const opened = await openDialog(AccountDeleteConfirmationDialog, metadata);
		wrapper = opened.wrapper;
		await buttonByText(wrapper, 'Yes, delete').trigger('click');
		await flushPromises();

		expect(trackAuthEvent).not.toHaveBeenCalled();
		expect(isOpen(wrapper)).toBe(true);
	});
});
