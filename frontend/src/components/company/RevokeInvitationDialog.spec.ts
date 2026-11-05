import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buttonByText, isOpen, openDialog } from '@/components/user-settings/dialogTestUtils';
import RevokeInvitationDialog from './RevokeInvitationDialog.vue';

const store = vi.hoisted(() => ({ revokeInvitation: vi.fn() }));
const trackAuthEvent = vi.hoisted(() => vi.fn());
vi.mock('@/stores/company', () => ({ useCompanyStore: () => store }));
vi.mock('@/components/auth/analytics', () => ({ trackAuthEvent }));

let wrapper: VueWrapper;

describe('RevokeInvitationDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		store.revokeInvitation.mockResolvedValue(undefined);
	});

	afterEach(() => wrapper.unmount());

	it('revokes the invitation of the email, tracks it and closes', async () => {
		const opened = await openDialog(RevokeInvitationDialog, {
			companyId: 'company-1',
			userEmail: 'stan@test.com',
		});
		wrapper = opened.wrapper;
		const { dialogRef } = opened;
		expect(wrapper.find('h2').text()).toBe('Revoke email invitation');
		expect(wrapper.find('strong').text()).toBe('stan@test.com');

		await buttonByText(wrapper, 'Revoke').trigger('click');
		await flushPromises();

		expect(store.revokeInvitation).toHaveBeenCalledWith('company-1', 'stan@test.com');
		expect(trackAuthEvent).toHaveBeenCalledWith('Company: invitation is revoked successfully');
		await expect(dialogRef.afterClosed()).resolves.toBeUndefined();
		expect(isOpen(wrapper)).toBe(false);
	});

	it('closes on Cancel without revoking', async () => {
		({ wrapper } = await openDialog(RevokeInvitationDialog, { companyId: 'company-1', userEmail: 'stan@test.com' }));
		await buttonByText(wrapper, 'Cancel').trigger('click');
		await flushPromises();

		expect(store.revokeInvitation).not.toHaveBeenCalled();
		expect(isOpen(wrapper)).toBe(false);
	});
});
