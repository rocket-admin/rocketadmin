import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountAuthView } from './authTestUtils';
import SetupView from './SetupView.vue';

const selfhosted = vi.hoisted(() => ({ createInitialUser: vi.fn() }));
vi.mock('@/stores/selfhosted', () => ({ useSelfhostedStore: () => selfhosted }));
vi.mock('@/lib/password-strength', () => ({ loadPasswordScorer: () => new Promise(() => {}) }));

const submitButton = (wrapper: Awaited<ReturnType<typeof mountAuthView>>['wrapper']) =>
	wrapper.find('[data-testid="setup-submit-button"]');

describe('SetupView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('keeps the submit button disabled until a valid email and a strong password are entered', async () => {
		const { wrapper } = await mountAuthView(SetupView, '/setup');

		expect(wrapper.text()).toContain('Create your admin account to get started.');
		expect(submitButton(wrapper).attributes('disabled')).toBeDefined();

		await wrapper.find('[data-testid="setup-email-input"]').setValue('admin@example.com');
		await wrapper.find('input[name="password"]').setValue('weak');
		expect(submitButton(wrapper).attributes('disabled')).toBeDefined();

		await wrapper.find('input[name="password"]').setValue('SecurePass123');
		expect(submitButton(wrapper).attributes('disabled')).toBeUndefined();
		wrapper.unmount();
	});

	it('does not submit without an email or a password', async () => {
		const { wrapper } = await mountAuthView(SetupView, '/setup');

		await wrapper.find('input[name="password"]').setValue('SecurePass123');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(selfhosted.createInitialUser).not.toHaveBeenCalled();
		wrapper.unmount();
	});

	it('creates the admin account and goes to /login', async () => {
		selfhosted.createInitialUser.mockResolvedValue({ success: true });
		const { wrapper, router } = await mountAuthView(SetupView, '/setup');

		await wrapper.find('[data-testid="setup-email-input"]').setValue('admin@example.com');
		await wrapper.find('input[name="password"]').setValue('SecurePass123');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(selfhosted.createInitialUser).toHaveBeenCalledWith({
			email: 'admin@example.com',
			password: 'SecurePass123',
		});
		expect(router.currentRoute.value.path).toBe('/login');
		wrapper.unmount();
	});

	it('stays on the page when the account cannot be created', async () => {
		selfhosted.createInitialUser.mockRejectedValue(new Error('exists'));
		const { wrapper, router } = await mountAuthView(SetupView, '/setup');

		await wrapper.find('[data-testid="setup-email-input"]').setValue('admin@example.com');
		await wrapper.find('input[name="password"]').setValue('SecurePass123');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(router.currentRoute.value.path).toBe('/setup');
		expect(submitButton(wrapper).text()).toBe('Create Admin Account');
		wrapper.unmount();
	});
});
