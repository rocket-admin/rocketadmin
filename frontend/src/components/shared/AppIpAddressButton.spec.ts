import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { vTooltip } from '@/components/ui';
import { useNotificationsStore } from '@/stores/notifications';
import AppIpAddressButton from './AppIpAddressButton.vue';

const copyToClipboard = vi.hoisted(() => vi.fn());
vi.mock('@/lib/clipboard', () => ({ copyToClipboard }));

function mountButton(ip: string) {
	return mount(AppIpAddressButton, { props: { ip }, global: { directives: { tooltip: vTooltip } } });
}

describe('AppIpAddressButton', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		copyToClipboard.mockReset();
	});

	it('shows the address', () => {
		expect(mountButton('18.221.81.73').text()).toBe('18.221.81.73');
	});

	it('copies the Rocketadmin address and confirms with a snackbar', async () => {
		copyToClipboard.mockResolvedValue(true);
		const notifications = useNotificationsStore();
		const spy = vi.spyOn(notifications, 'showSuccessSnackbar');

		await mountButton('18.221.81.73').find('button').trigger('click');
		await flushPromises();

		expect(copyToClipboard).toHaveBeenCalledWith('18.221.81.73/32');
		expect(spy).toHaveBeenCalledWith('18.221.81.73 IP address was copied to clipboard.');
	});

	it('shows nothing when the copy fails', async () => {
		copyToClipboard.mockResolvedValue(false);
		const spy = vi.spyOn(useNotificationsStore(), 'showSuccessSnackbar');

		await mountButton('18.221.81.73').find('button').trigger('click');
		await flushPromises();

		expect(spy).not.toHaveBeenCalled();
	});
});
