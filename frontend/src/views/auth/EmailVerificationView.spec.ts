import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountAuthView } from './authTestUtils';
import EmailVerificationView from './EmailVerificationView.vue';

const auth = vi.hoisted(() => ({ verifyEmail: vi.fn() }));
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth, TOKEN_EXPIRATION_KEY: 'token_expiration' }));

const PATTERN = '/external/user/email/verify/:verificationToken';
const mountPage = () => mountAuthView(EmailVerificationView, PATTERN, '/external/user/email/verify/1234567890-abcd');

describe('EmailVerificationView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	it('verifies the token and sends a signed-out visitor to /login', async () => {
		auth.verifyEmail.mockResolvedValue({});
		const { wrapper, router } = await mountPage();

		expect(auth.verifyEmail).toHaveBeenCalledWith('1234567890-abcd');
		expect(router.currentRoute.value.path).toBe('/login');
		wrapper.unmount();
	});

	it('sends a signed-in visitor to /user-settings', async () => {
		localStorage.setItem('token_expiration', new Date(Date.now() + 60_000).toISOString());
		auth.verifyEmail.mockResolvedValue({});
		const { wrapper, router } = await mountPage();

		expect(router.currentRoute.value.path).toBe('/user-settings');
		wrapper.unmount();
	});

	it('stays on "Verifying..." when the verification fails', async () => {
		auth.verifyEmail.mockRejectedValue(new Error('invalid'));
		const { wrapper, router } = await mountPage();
		await flushPromises();

		expect(wrapper.find('h1').text()).toBe('Verifying...');
		expect(router.currentRoute.value.path).toBe('/external/user/email/verify/1234567890-abcd');
		wrapper.unmount();
	});
});
