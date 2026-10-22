import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotificationsStore } from '@/stores/notifications';
import MasterEncryptionPassword from './MasterEncryptionPassword.vue';

const copyToClipboard = vi.hoisted(() => vi.fn());
const trackConnectionEvent = vi.hoisted(() => vi.fn());
vi.mock('@/lib/clipboard', () => ({ copyToClipboard }));
vi.mock('./analytics', () => ({ trackConnectionEvent }));

describe('MasterEncryptionPassword', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('starts off, without a password', () => {
		const wrapper = mount(MasterEncryptionPassword);

		expect(
			(wrapper.find('[data-testid="connection-master-encryption-toggle"]').element as HTMLInputElement).checked,
		).toBe(false);
		expect(wrapper.find('[data-testid="connection-master-password-input"]').exists()).toBe(false);
	});

	it('generates a password when switched on and shows it with the warning', async () => {
		const wrapper = mount(MasterEncryptionPassword);

		await wrapper.find('[data-testid="connection-master-encryption-toggle"]').setValue(true);

		const [[key]] = wrapper.emitted('masterKeyChange') as [[string]];
		expect(atob(key)).toHaveLength(32);
		expect((wrapper.find('[data-testid="connection-master-password-input"]').element as HTMLInputElement).value).toBe(
			key,
		);
		expect(wrapper.text()).toContain('Rocketadmin will not store your master password.');
		expect(trackConnectionEvent).toHaveBeenCalledWith(
			'Connection creds: client-side encryption is switched',
			{ enable: true },
			undefined,
		);
	});

	it('does not generate a password when switched off', async () => {
		const wrapper = mount(MasterEncryptionPassword, { props: { enabled: true, masterKey: 'abc' } });

		await wrapper.find('[data-testid="connection-master-encryption-toggle"]').setValue(false);

		expect(wrapper.emitted('masterKeyChange')).toBeUndefined();
		expect(wrapper.find('[data-testid="connection-master-password-input"]').exists()).toBe(false);
	});

	it('copies the password', async () => {
		copyToClipboard.mockResolvedValue(true);
		const wrapper = mount(MasterEncryptionPassword, { props: { enabled: true, masterKey: 'abc' } });
		const snackbar = vi.spyOn(useNotificationsStore(), 'showSuccessSnackbar');

		await wrapper.find('[data-testid="connection-master-password-copy-button"]').trigger('click');
		await flushPromises();

		expect(copyToClipboard).toHaveBeenCalledWith('abc');
		expect(snackbar).toHaveBeenCalledWith('Master password was copied to clipboard.');
	});

	it('can be disabled', () => {
		const wrapper = mount(MasterEncryptionPassword, { props: { disabled: true } });

		expect(wrapper.find('[data-testid="connection-master-encryption-toggle"]').attributes('disabled')).toBeDefined();
	});
});
