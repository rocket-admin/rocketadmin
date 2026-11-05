import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Secret } from '@/models/secret';
import DeleteSecretDialog from './DeleteSecretDialog.vue';
import { buttonByText, isOpen, mockSecret, openDialog } from './secretsTestUtils';

const store = vi.hoisted(() => ({ deleteSecret: vi.fn() }));
const trackEvent = vi.hoisted(() => vi.fn());
vi.mock('@/stores/secrets', () => ({ useSecretsStore: () => store }));
vi.mock('@/composables/useAnalytics', () => ({ trackEvent }));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

let wrapper: VueWrapper;

const confirmButton = () => wrapper.find('[data-testid="delete-secret-confirm-button"]');

async function mountDialog(secret: Secret = mockSecret) {
	const opened = await openDialog<boolean>(DeleteSecretDialog, { secret });
	wrapper = opened.wrapper;
	return opened.dialogRef;
}

describe('DeleteSecretDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		store.deleteSecret.mockResolvedValue({ message: 'Secret deleted successfully', deletedAt: '2024-01-01T00:00:00Z' });
	});

	afterEach(() => wrapper.unmount());

	it('asks to confirm deleting the secret by its identifier', async () => {
		await mountDialog();
		expect(wrapper.find('h2').text()).toBe('Delete Secret');
		expect(wrapper.find('strong').text()).toBe('test-secret');
		expect(wrapper.text()).toContain('This action cannot be undone.');
		expect(confirmButton().text()).toBe('Delete Secret');
	});

	it('deletes the secret once, tracks it and closes with true', async () => {
		const dialogRef = await mountDialog();
		await confirmButton().trigger('click');
		await flushPromises();

		expect(store.deleteSecret).toHaveBeenCalledTimes(1);
		expect(store.deleteSecret).toHaveBeenCalledWith('test-secret');
		expect(trackEvent).toHaveBeenCalledWith('Secrets: secret deleted successfully');
		await expect(dialogRef.afterClosed()).resolves.toBe(true);
		expect(isOpen(wrapper)).toBe(false);
	});

	it('deletes a secret with master encryption the same way', async () => {
		await mountDialog({ ...mockSecret, masterEncryption: true });
		await confirmButton().trigger('click');
		await flushPromises();
		expect(store.deleteSecret).toHaveBeenCalledWith('test-secret');
	});

	it('shows "Deleting..." and locks Cancel while the request is in flight', async () => {
		let resolve: (value: unknown) => void = () => {};
		store.deleteSecret.mockReturnValue(new Promise((r) => (resolve = r)));
		await mountDialog();
		await confirmButton().trigger('click');

		expect(confirmButton().text()).toBe('Deleting...');
		expect(buttonByText(wrapper, 'Cancel').attributes('disabled')).toBeDefined();
		resolve({});
		await flushPromises();
	});

	it('stays open and re-enables the buttons when deleting fails', async () => {
		store.deleteSecret.mockRejectedValue(new Error('Error'));
		await mountDialog();
		await confirmButton().trigger('click');
		await flushPromises();

		expect(isOpen(wrapper)).toBe(true);
		expect(confirmButton().text()).toBe('Delete Secret');
		expect(confirmButton().attributes('disabled')).toBeUndefined();
	});

	it('closes without a result on Cancel', async () => {
		const dialogRef = await mountDialog();
		await buttonByText(wrapper, 'Cancel').trigger('click');

		await expect(dialogRef.afterClosed()).resolves.toBeUndefined();
		expect(store.deleteSecret).not.toHaveBeenCalled();
	});
});
