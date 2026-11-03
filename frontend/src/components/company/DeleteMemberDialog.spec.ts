import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buttonByText, isOpen, openDialog } from '@/components/user-settings/dialogTestUtils';
import DeleteMemberDialog from './DeleteMemberDialog.vue';

const store = vi.hoisted(() => ({ removeCompanyMember: vi.fn() }));
const trackAuthEvent = vi.hoisted(() => vi.fn());
vi.mock('@/stores/company', () => ({ useCompanyStore: () => store }));
vi.mock('@/components/auth/analytics', () => ({ trackAuthEvent }));

let wrapper: VueWrapper;
const data = { companyId: 'company-1', user: { id: 'user-1', email: 'kyle@test.com', name: 'Kyle' } };

describe('DeleteMemberDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		store.removeCompanyMember.mockResolvedValue({});
	});

	afterEach(() => wrapper.unmount());

	it('names the member, falling back to the email', async () => {
		({ wrapper } = await openDialog(DeleteMemberDialog, { ...data, user: { ...data.user, name: '' } }));
		expect(wrapper.find('h2').text()).toBe('Confirm member delete');
		expect(wrapper.find('strong').text()).toBe('kyle@test.com');
	});

	it('removes the member, tracks it and closes', async () => {
		const opened = await openDialog(DeleteMemberDialog, data);
		wrapper = opened.wrapper;
		const { dialogRef } = opened;
		expect(wrapper.find('strong').text()).toBe('Kyle');

		await buttonByText(wrapper, 'Delete').trigger('click');
		await flushPromises();

		expect(store.removeCompanyMember).toHaveBeenCalledWith('company-1', 'user-1', 'kyle@test.com', 'Kyle');
		expect(trackAuthEvent).toHaveBeenCalledWith('Company: member is deleted successfully');
		await expect(dialogRef.afterClosed()).resolves.toBeUndefined();
		expect(isOpen(wrapper)).toBe(false);
	});

	it('stays open when the request fails', async () => {
		store.removeCompanyMember.mockRejectedValue(new Error('nope'));
		({ wrapper } = await openDialog(DeleteMemberDialog, data));

		await buttonByText(wrapper, 'Delete').trigger('click');
		await flushPromises();

		expect(trackAuthEvent).not.toHaveBeenCalled();
		expect(isOpen(wrapper)).toBe(true);
	});
});
