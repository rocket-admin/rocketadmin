import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CreateSecretDialog from './CreateSecretDialog.vue';
import { isOpen, mockSecret, openDialog } from './secretsTestUtils';

const store = vi.hoisted(() => ({ createSecret: vi.fn() }));
const trackEvent = vi.hoisted(() => vi.fn());
vi.mock('@/stores/secrets', () => ({ useSecretsStore: () => store }));
vi.mock('@/composables/useAnalytics', () => ({ trackEvent }));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

let wrapper: VueWrapper;

const input = (testId: string) => wrapper.find(`[data-testid="${testId}"]`);
const submitButton = () => wrapper.find('button[type="submit"]');
const isSubmitDisabled = () => submitButton().attributes('disabled') !== undefined;

async function mountDialog() {
	const opened = await openDialog<boolean>(CreateSecretDialog);
	wrapper = opened.wrapper;
	return opened.dialogRef;
}

async function fillRequired(slug = 'test-secret', value = 'secret-value') {
	await input('create-secret-slug-input').setValue(slug);
	await input('create-secret-value-input').setValue(value);
}

async function submit() {
	await wrapper.find('form').trigger('submit');
	await flushPromises();
}

describe('CreateSecretDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		store.createSecret.mockResolvedValue(mockSecret);
	});

	afterEach(() => wrapper.unmount());

	it('starts empty with the submit button disabled', async () => {
		await mountDialog();
		expect(wrapper.find('h2').text()).toBe('Create Secret');
		expect((input('create-secret-slug-input').element as HTMLInputElement).value).toBe('');
		expect((input('create-secret-value-input').element as HTMLTextAreaElement).value).toBe('');
		expect((input('create-secret-expires-input').element as HTMLInputElement).value).toBe('');
		expect(input('create-secret-master-password-input').exists()).toBe(false);
		expect(submitButton().text()).toBe('Create Secret');
		expect(isSubmitDisabled()).toBe(true);
	});

	describe('slug validation', () => {
		it('requires the unique identifier once the field was left', async () => {
			await mountDialog();
			await input('create-secret-slug-input').trigger('blur');
			expect(wrapper.text()).toContain('Unique identifier is required');
		});

		it.each(['invalid slug', 'invalid!slug', 'invalid@slug', 'invalid#slug'])('rejects "%s"', async (slug) => {
			await mountDialog();
			await fillRequired(slug);
			await input('create-secret-slug-input').trigger('blur');
			expect(wrapper.text()).toContain('Only letters, numbers, hyphens, and underscores allowed (no spaces)');
			expect(isSubmitDisabled()).toBe(true);
		});

		it.each(['valid-slug', 'valid_slug', 'ValidSlug123', 'valid-slug_123'])('accepts "%s"', async (slug) => {
			await mountDialog();
			await fillRequired(slug);
			expect(isSubmitDisabled()).toBe(false);
		});

		it('allows at most 255 characters', async () => {
			await mountDialog();
			await fillRequired('a'.repeat(256));
			await input('create-secret-slug-input').trigger('blur');
			expect(wrapper.text()).toContain('Unique identifier must be 255 characters or less');
			expect(isSubmitDisabled()).toBe(true);

			await input('create-secret-slug-input').setValue('a'.repeat(255));
			expect(isSubmitDisabled()).toBe(false);
		});
	});

	describe('value validation', () => {
		it('requires a value once the field was left', async () => {
			await mountDialog();
			await input('create-secret-value-input').trigger('blur');
			expect(wrapper.text()).toContain('Value is required');
		});

		it('allows at most 10000 characters', async () => {
			await mountDialog();
			await fillRequired('test-secret', 'a'.repeat(10001));
			await input('create-secret-value-input').trigger('blur');
			expect(wrapper.text()).toContain('Value must be 10000 characters or less');
			expect(isSubmitDisabled()).toBe(true);

			await input('create-secret-value-input').setValue('a'.repeat(10000));
			expect(isSubmitDisabled()).toBe(false);
		});
	});

	describe('master encryption', () => {
		async function enableEncryption() {
			await wrapper.find('[data-testid="create-secret-master-encryption-checkbox"]').setValue(true);
		}

		it('requires a master password of at least 8 characters when enabled', async () => {
			await mountDialog();
			await fillRequired();
			await enableEncryption();

			const password = input('create-secret-master-password-input');
			expect(password.exists()).toBe(true);
			expect(isSubmitDisabled()).toBe(true);
			await password.trigger('blur');
			expect(wrapper.text()).toContain('Master password is required for encryption');

			await password.setValue('short');
			expect(wrapper.text()).toContain('Master password must be at least 8 characters');
			expect(isSubmitDisabled()).toBe(true);

			await password.setValue('12345678');
			expect(isSubmitDisabled()).toBe(false);
		});

		it('clears the master password when disabled again', async () => {
			await mountDialog();
			await fillRequired();
			await enableEncryption();
			await input('create-secret-master-password-input').setValue('password123');

			await wrapper.find('[data-testid="create-secret-master-encryption-checkbox"]').setValue(false);
			expect(input('create-secret-master-password-input').exists()).toBe(false);
			expect(isSubmitDisabled()).toBe(false);

			await enableEncryption();
			expect((input('create-secret-master-password-input').element as HTMLInputElement).value).toBe('');
		});

		it('sends the master password with the secret', async () => {
			await mountDialog();
			await fillRequired();
			await enableEncryption();
			await input('create-secret-master-password-input').setValue('password123');
			await submit();

			expect(store.createSecret).toHaveBeenCalledWith(
				expect.objectContaining({
					slug: 'test-secret',
					value: 'secret-value',
					masterEncryption: true,
					masterPassword: 'password123',
				}),
			);
		});
	});

	describe('visibility toggles', () => {
		it('masks the value until shown', async () => {
			await mountDialog();
			const value = () => input('create-secret-value-input');
			const toggle = () => wrapper.find('[data-testid="create-secret-value-toggle"]');
			expect(value().classes()).toContain('create-secret__value--masked');
			expect(toggle().attributes('aria-label')).toBe('Show value');

			await toggle().trigger('click');
			expect(value().classes()).not.toContain('create-secret__value--masked');
			expect(toggle().attributes('aria-label')).toBe('Hide value');

			await toggle().trigger('click');
			expect(value().classes()).toContain('create-secret__value--masked');
		});

		it('toggles the master password between password and text', async () => {
			await mountDialog();
			await wrapper.find('[data-testid="create-secret-master-encryption-checkbox"]').setValue(true);
			const password = () => input('create-secret-master-password-input');
			expect(password().attributes('type')).toBe('password');

			await wrapper.find('[data-testid="create-secret-master-password-toggle"]').trigger('click');
			expect(password().attributes('type')).toBe('text');

			await wrapper.find('[data-testid="create-secret-master-password-toggle"]').trigger('click');
			expect(password().attributes('type')).toBe('password');
		});
	});

	describe('submission', () => {
		it('does not submit an invalid form', async () => {
			await mountDialog();
			await submit();
			expect(store.createSecret).not.toHaveBeenCalled();
		});

		it('creates the secret without encryption fields, tracks it and closes with true', async () => {
			const dialogRef = await mountDialog();
			await fillRequired();
			await submit();

			expect(store.createSecret).toHaveBeenCalledWith({
				slug: 'test-secret',
				value: 'secret-value',
				expiresAt: undefined,
				masterEncryption: undefined,
				masterPassword: undefined,
			});
			expect(trackEvent).toHaveBeenCalledWith('Secrets: secret created successfully');
			await expect(dialogRef.afterClosed()).resolves.toBe(true);
		});

		it('sends the expiration date as an ISO timestamp of local midnight', async () => {
			await mountDialog();
			await fillRequired();
			await input('create-secret-expires-input').setValue('2099-06-15');
			await submit();

			expect(store.createSecret).toHaveBeenCalledWith(
				expect.objectContaining({ expiresAt: new Date(2099, 5, 15).toISOString() }),
			);
		});

		it('offers only future dates', async () => {
			await mountDialog();
			expect(input('create-secret-expires-input').attributes('min')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});

		it('shows "Creating..." while the request is in flight', async () => {
			let resolve: (secret: typeof mockSecret) => void = () => {};
			store.createSecret.mockReturnValue(new Promise((r) => (resolve = r)));
			await mountDialog();
			await fillRequired();
			await submit();

			expect(submitButton().text()).toBe('Creating...');
			resolve(mockSecret);
			await flushPromises();
		});

		it('stays open and re-enables the form when creating fails', async () => {
			store.createSecret.mockRejectedValue(new Error('Error'));
			await mountDialog();
			await fillRequired();
			await submit();

			expect(isOpen(wrapper)).toBe(true);
			expect(submitButton().text()).toBe('Create Secret');
			expect(isSubmitDisabled()).toBe(false);
		});
	});
});
