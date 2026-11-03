import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buttonByText, isOpen, openDialog } from '@/components/user-settings/dialogTestUtils';
import DeleteDomainDialog from './DeleteDomainDialog.vue';

const store = vi.hoisted(() => ({ deleteCustomDomain: vi.fn() }));
const trackAuthEvent = vi.hoisted(() => vi.fn());
vi.mock('@/stores/company', () => ({ useCompanyStore: () => store }));
vi.mock('@/components/auth/analytics', () => ({ trackAuthEvent }));

let wrapper: VueWrapper;

describe('DeleteDomainDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		store.deleteCustomDomain.mockResolvedValue({});
	});

	afterEach(() => wrapper.unmount());

	it('deletes the custom domain of the company, tracks it and closes', async () => {
		const opened = await openDialog(DeleteDomainDialog, {
			companyId: 'company-1',
			domain: 'admin.example.com',
		});
		wrapper = opened.wrapper;
		const { dialogRef } = opened;
		expect(wrapper.text()).toContain('You are about to remove admin.example.com from your company');

		await buttonByText(wrapper, 'Delete').trigger('click');
		await flushPromises();

		expect(store.deleteCustomDomain).toHaveBeenCalledWith('company-1');
		expect(trackAuthEvent).toHaveBeenCalledWith('Company: domain is deleted successfully');
		await expect(dialogRef.afterClosed()).resolves.toBeUndefined();
		expect(isOpen(wrapper)).toBe(false);
	});
});
