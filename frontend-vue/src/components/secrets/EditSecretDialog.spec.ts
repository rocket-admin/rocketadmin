import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import type { Secret } from '@/models/secret';
import EditSecretDialog from './EditSecretDialog.vue';
import { isOpen, mockSecret, openDialog } from './secretsTestUtils';
import { toDateInputValue } from './secretUtils';

const store = vi.hoisted(() => ({ updateSecret: vi.fn() }));
const trackEvent = vi.hoisted(() => vi.fn());
vi.mock('@/stores/secrets', () => ({ useSecretsStore: () => store }));
vi.mock('@/composables/useAnalytics', () => ({ trackEvent }));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

const secretWithExpiration: Secret = { ...mockSecret, expiresAt: '2099-12-31T15:30:00Z' };
const secretWithEncryption: Secret = { ...mockSecret, masterEncryption: true };

let wrapper: VueWrapper;

const input = (testId: string) => wrapper.find(`[data-testid="${testId}"]`);
const submitButton = () => wrapper.find('button[type="submit"]');
const isSubmitDisabled = () => submitButton().attributes('disabled') !== undefined;

async function mountDialog(secret: Secret = mockSecret) {
	const opened = await openDialog<boolean>(EditSecretDialog, { secret });
	wrapper = opened.wrapper;
	return opened.dialogRef;
}

async function submit() {
	await wrapper.find('form').trigger('submit');
	await flushPromises();
}

describe('EditSecretDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		store.updateSecret.mockResolvedValue(mockSecret);
	});

	afterEach(() => wrapper.unmount());

	describe('initial state', () => {
		it('shows the slug in the title and starts with an empty value and no expiration', async () => {
			await mountDialog();
			expect(wrapper.find('h2').text()).toBe('Edit Secret: test-secret');
			expect(wrapper.text()).toContain('The current value cannot be viewed for security reasons.');
			expect((input('edit-secret-value-input').element as HTMLTextAreaElement).value).toBe('');
			expect((input('edit-secret-expires-input').element as HTMLInputElement).value).toBe('');
			expect(input('edit-secret-master-password-input').exists()).toBe(false);
			expect(submitButton().text()).toBe('Save Changes');
			expect(isSubmitDisabled()).toBe(true);
		});

		it('prefills the existing expiration date', async () => {
			await mountDialog(secretWithExpiration);
			expect((input('edit-secret-expires-input').element as HTMLInputElement).value).toBe(
				toDateInputValue(new Date(secretWithExpiration.expiresAt as string)),
			);
		});
	});

	describe('value validation', () => {
		it('requires a new value once the field was left', async () => {
			await mountDialog();
			await input('edit-secret-value-input').trigger('blur');
			expect(wrapper.text()).toContain('New value is required');

			await input('edit-secret-value-input').setValue('some-value');
			expect(wrapper.text()).not.toContain('New value is required');
			expect(isSubmitDisabled()).toBe(false);
		});

		it('allows at most 10000 characters', async () => {
			await mountDialog();
			await input('edit-secret-value-input').setValue('a'.repeat(10001));
			await input('edit-secret-value-input').trigger('blur');
			expect(wrapper.text()).toContain('Value must be 10000 characters or less');
			expect(isSubmitDisabled()).toBe(true);

			await input('edit-secret-value-input').setValue('a'.repeat(10000));
			expect(isSubmitDisabled()).toBe(false);
		});
	});

	describe('visibility toggles', () => {
		it('masks the value until shown', async () => {
			await mountDialog();
			const toggle = () => wrapper.find('[data-testid="edit-secret-value-toggle"]');
			expect(input('edit-secret-value-input').classes()).toContain('edit-secret__value--masked');
			await toggle().trigger('click');
			expect(input('edit-secret-value-input').classes()).not.toContain('edit-secret__value--masked');
			expect(toggle().attributes('aria-label')).toBe('Hide value');
			await toggle().trigger('click');
			expect(input('edit-secret-value-input').classes()).toContain('edit-secret__value--masked');
		});

		it('toggles the master password between password and text', async () => {
			await mountDialog(secretWithEncryption);
			const toggle = () => wrapper.find('[data-testid="edit-secret-master-password-toggle"]');
			expect(input('edit-secret-master-password-input').attributes('type')).toBe('password');
			await toggle().trigger('click');
			expect(input('edit-secret-master-password-input').attributes('type')).toBe('text');
			await toggle().trigger('click');
			expect(input('edit-secret-master-password-input').attributes('type')).toBe('password');
		});
	});

	describe('clear expiration', () => {
		it('disables the date while "Remove expiration date" is checked', async () => {
			await mountDialog(secretWithExpiration);
			const checkbox = input('edit-secret-clear-expiration-checkbox');

			await checkbox.setValue(true);
			expect(input('edit-secret-expires-input').attributes('disabled')).toBeDefined();

			await checkbox.setValue(false);
			expect(input('edit-secret-expires-input').attributes('disabled')).toBeUndefined();
		});
	});

	describe('submission', () => {
		it('does not submit an invalid form', async () => {
			await mountDialog();
			await submit();
			expect(store.updateSecret).not.toHaveBeenCalled();
		});

		it('updates the value without a master password, tracks it and closes with true', async () => {
			const dialogRef = await mountDialog();
			await input('edit-secret-value-input').setValue('new-value');
			await submit();

			expect(store.updateSecret).toHaveBeenCalledWith(
				'test-secret',
				{ value: 'new-value', expiresAt: undefined },
				undefined,
			);
			expect(trackEvent).toHaveBeenCalledWith('Secrets: secret updated successfully');
			await expect(dialogRef.afterClosed()).resolves.toBe(true);
		});

		it('sends a new expiration date as local midnight', async () => {
			await mountDialog();
			await input('edit-secret-value-input').setValue('new-value');
			await input('edit-secret-expires-input').setValue('2099-06-15');
			await submit();

			expect(store.updateSecret).toHaveBeenCalledWith(
				'test-secret',
				{ value: 'new-value', expiresAt: new Date(2099, 5, 15).toISOString() },
				undefined,
			);
		});

		it('keeps an untouched expiration date as it was', async () => {
			await mountDialog(secretWithExpiration);
			await input('edit-secret-value-input').setValue('new-value');
			await submit();

			expect(store.updateSecret).toHaveBeenCalledWith(
				'test-secret',
				{ value: 'new-value', expiresAt: '2099-12-31T15:30:00.000Z' },
				undefined,
			);
		});

		it('sends a null expiration when it is removed', async () => {
			await mountDialog(secretWithExpiration);
			await input('edit-secret-value-input').setValue('new-value');
			await input('edit-secret-clear-expiration-checkbox').setValue(true);
			await submit();

			expect(store.updateSecret).toHaveBeenCalledWith(
				'test-secret',
				{ value: 'new-value', expiresAt: null },
				undefined,
			);
		});

		it('shows "Saving..." while the request is in flight', async () => {
			let resolve: (secret: Secret) => void = () => {};
			store.updateSecret.mockReturnValue(new Promise((r) => (resolve = r)));
			await mountDialog();
			await input('edit-secret-value-input').setValue('new-value');
			await submit();

			expect(submitButton().text()).toBe('Saving...');
			resolve(mockSecret);
			await flushPromises();
		});

		it('stays open and re-enables the form on a non-403 error', async () => {
			store.updateSecret.mockRejectedValue(new ApiError('Server error', 500, {}));
			await mountDialog();
			await input('edit-secret-value-input').setValue('new-value');
			await submit();

			expect(isOpen(wrapper)).toBe(true);
			expect(submitButton().text()).toBe('Save Changes');
			expect(wrapper.text()).not.toContain('Invalid master password');
		});
	});

	describe('master encryption', () => {
		it('requires the master password before sending', async () => {
			await mountDialog(secretWithEncryption);
			expect(wrapper.text()).toContain('Required to encrypt the new value');
			await input('edit-secret-value-input').setValue('new-value');
			await submit();

			expect(wrapper.text()).toContain('Master password is required');
			expect(store.updateSecret).not.toHaveBeenCalled();
		});

		it('sends the master password with the update', async () => {
			await mountDialog(secretWithEncryption);
			await input('edit-secret-value-input').setValue('new-value');
			await input('edit-secret-master-password-input').setValue('my-master-password');
			await submit();

			expect(store.updateSecret).toHaveBeenCalledWith(
				'test-secret',
				expect.objectContaining({ value: 'new-value' }),
				'my-master-password',
			);
		});

		it('reports a wrong master password on 403', async () => {
			store.updateSecret.mockRejectedValue(new ApiError('Forbidden', 403, {}));
			await mountDialog(secretWithEncryption);
			await input('edit-secret-value-input').setValue('new-value');
			await input('edit-secret-master-password-input').setValue('wrong-password');
			await submit();

			expect(wrapper.text()).toContain('Invalid master password');
			expect(isOpen(wrapper)).toBe(true);
			expect(submitButton().text()).toBe('Save Changes');
		});
	});
});
