import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountAuthView } from './authTestUtils';
import PasswordResetView from './PasswordResetView.vue';

const user = vi.hoisted(() => ({ resetPassword: vi.fn() }));
vi.mock('@/stores/user', () => ({ useUserStore: () => user }));
vi.mock('@/lib/password-strength', () => ({ loadPasswordScorer: () => new Promise(() => {}) }));

const PATTERN = '/external/user/password/reset/verify/:verificationToken';
const mountPage = () => mountAuthView(PasswordResetView, PATTERN, '/external/user/password/reset/verify/token-123');

describe('PasswordResetView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('enables Change only for a strong password', async () => {
		const { wrapper } = await mountPage();
		const button = () => wrapper.find('[data-testid="password-reset-button"]');

		expect(wrapper.find('h1').text()).toBe('Change your password');
		expect(button().attributes('disabled')).toBeDefined();
		await wrapper.find('input[name="password"]').setValue('weakpass');
		expect(button().attributes('disabled')).toBeDefined();
		await wrapper.find('input[name="password"]').setValue('Str0ngPass');
		expect(button().attributes('disabled')).toBeUndefined();
		wrapper.unmount();
	});

	it('resets the password with the link token and goes to /login', async () => {
		user.resetPassword.mockResolvedValue({});
		const { wrapper, router } = await mountPage();

		await wrapper.find('input[name="password"]').setValue('Str0ngPass');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(user.resetPassword).toHaveBeenCalledWith('token-123', 'Str0ngPass');
		expect(router.currentRoute.value.path).toBe('/login');
		wrapper.unmount();
	});

	it('stays on the page when the reset fails', async () => {
		user.resetPassword.mockRejectedValue(new Error('expired'));
		const { wrapper, router } = await mountPage();

		await wrapper.find('input[name="password"]').setValue('Str0ngPass');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(router.currentRoute.value.path).toBe('/external/user/password/reset/verify/token-123');
		wrapper.unmount();
	});
});
