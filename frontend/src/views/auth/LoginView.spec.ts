import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthResponse } from '@/stores/auth';
import { buttonByText, mountAuthView } from './authTestUtils';
import LoginView from './LoginView.vue';

const env = vi.hoisted(() => ({ saas: false }));
const auth = vi.hoisted(() => ({
	fetchUserCompanies: vi.fn(),
	loginUser: vi.fn(),
	loginWith2FA: vi.fn(),
	loginWithGoogle: vi.fn(),
	loginWithGithub: vi.fn(),
}));
const company = vi.hoisted(() => ({ isCustomDomain: vi.fn(() => false) }));
const googleMount = vi.hoisted(() => vi.fn());
const trackAuthEvent = vi.hoisted(() => vi.fn());

vi.mock('@/environment', () => ({ environment: env }));
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }));
vi.mock('@/stores/company', () => ({ useCompanyStore: () => company }));
vi.mock('@/composables/useGoogleSignIn', () => ({ useGoogleSignIn: () => ({ mount: googleMount }) }));
vi.mock('@/components/auth/analytics', () => ({ trackAuthEvent }));

const mountLogin = (url = '/login') => mountAuthView(LoginView, '/login', url);

describe('LoginView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		env.saas = false;
		company.isCustomDomain.mockReturnValue(false);
		auth.loginUser.mockResolvedValue({ expires: '2030-01-01' } satisfies AuthResponse);
	});

	it('asks for the email first and looks up its companies on Next', async () => {
		auth.fetchUserCompanies.mockResolvedValue([{ id: 'c1', name: 'South Park' }]);
		const { wrapper } = await mountLogin();

		expect(wrapper.find('[data-testid="login-password-input"]').exists()).toBe(false);
		expect(buttonByText(wrapper, 'Next').attributes('disabled')).toBeDefined();
		expect(wrapper.text()).toContain('To log in, please start by entering your email address');

		await wrapper.find('[data-testid="login-email-input"]').setValue('eric@cartman.ass');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(auth.fetchUserCompanies).toHaveBeenCalledWith('eric@cartman.ass');
		expect(trackAuthEvent).toHaveBeenCalledWith('Login: companies is received', { count: 1 });
		// One company is picked automatically: Next goes, the password and Log in appear.
		expect(wrapper.find('[data-testid="login-next-button"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="login-password-input"]').exists()).toBe(true);
		wrapper.unmount();
	});

	it('logs in with email, password and the company', async () => {
		auth.fetchUserCompanies.mockResolvedValue([{ id: 'c1', name: 'South Park' }]);
		const { wrapper } = await mountLogin();

		await wrapper.find('[data-testid="login-email-input"]').setValue('eric@cartman.ass');
		await wrapper.find('form').trigger('submit');
		await flushPromises();
		await wrapper.find('[data-testid="login-password-input"]').setValue('12345678');
		expect(buttonByText(wrapper, 'Log in').attributes('disabled')).toBeUndefined();
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(auth.loginUser).toHaveBeenCalledWith({
			email: 'eric@cartman.ass',
			password: '12345678',
			companyId: 'c1',
		});
		expect(trackAuthEvent).toHaveBeenCalledWith('Login: login success');
		expect(wrapper.find('[data-testid="login-otp-input"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('lets the user pick one of several companies', async () => {
		auth.fetchUserCompanies.mockResolvedValue([
			{ id: 'c1', name: 'South Park' },
			{ id: 'c2', name: 'North Park' },
		]);
		const { wrapper } = await mountLogin();

		await wrapper.find('[data-testid="login-email-input"]').setValue('eric@cartman.ass');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(wrapper.text()).toContain('Please select the company or organization');
		expect(wrapper.find('[data-testid="login-password-input"]').exists()).toBe(false);
		const select = wrapper.find('select');
		const option = select.findAll('option').find((candidate) => candidate.text() === 'North Park');
		await select.setValue(option?.attributes('value'));

		expect(wrapper.find('[data-testid="login-password-input"]').exists()).toBe(true);
		await wrapper.find('[data-testid="login-password-input"]').setValue('12345678');
		await wrapper.find('form').trigger('submit');
		await flushPromises();
		expect(auth.loginUser).toHaveBeenCalledWith(expect.objectContaining({ companyId: 'c2' }));
		wrapper.unmount();
	});

	it('switches to the 2FA step on a temporary response and verifies the code', async () => {
		company.isCustomDomain.mockReturnValue(true);
		env.saas = true;
		auth.loginUser.mockResolvedValue({ isTemporary: true });
		auth.loginWith2FA.mockResolvedValue({ expires: '2030-01-01' });
		const { wrapper } = await mountLogin();

		await wrapper.find('[data-testid="login-email-input"]').setValue('eric@cartman.ass');
		await wrapper.find('[data-testid="login-password-input"]').setValue('12345678');
		await wrapper.findAll('form')[0]?.trigger('submit');
		await flushPromises();

		expect(wrapper.text()).toContain('Enter 2nd factor code');
		await wrapper.find('[data-testid="login-otp-input"]').setValue('123456');
		await wrapper.findAll('form')[1]?.trigger('submit');
		await flushPromises();

		expect(auth.loginWith2FA).toHaveBeenCalledWith('123456');
		expect(trackAuthEvent).toHaveBeenCalledWith('Login: login with 2fa success');
		wrapper.unmount();
	});

	it('asks for the password straight away on a custom domain, without social login', async () => {
		env.saas = true;
		company.isCustomDomain.mockReturnValue(true);
		const { wrapper } = await mountLogin();

		expect(wrapper.find('[data-testid="login-password-input"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="login-next-button"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="login-github-button"]').exists()).toBe(false);
		expect(googleMount).not.toHaveBeenCalled();

		await wrapper.find('[data-testid="login-email-input"]').setValue('eric@cartman.ass');
		await wrapper.find('[data-testid="login-password-input"]').setValue('12345678');
		await wrapper.find('form').trigger('submit');
		await flushPromises();
		expect(auth.loginUser).toHaveBeenCalledWith({ email: 'eric@cartman.ass', password: '12345678', companyId: '' });
		expect(auth.fetchUserCompanies).not.toHaveBeenCalled();
		wrapper.unmount();
	});

	it('offers Google and GitHub sign-in in SaaS', async () => {
		env.saas = true;
		auth.loginWithGoogle.mockResolvedValue({ isTemporary: true });
		const { wrapper } = await mountLogin();

		const container = wrapper.find('[data-testid="login-google-button"]');
		expect(googleMount).toHaveBeenCalledWith(container.element, expect.any(Function));
		const onCredential = googleMount.mock.calls[0]?.[1] as (credential: string) => void;
		onCredential('google-token');
		await flushPromises();
		expect(auth.loginWithGoogle).toHaveBeenCalledWith('google-token');
		expect(wrapper.text()).toContain('Enter 2nd factor code');

		await wrapper.find('[data-testid="login-github-button"]').trigger('click');
		expect(auth.loginWithGithub).toHaveBeenCalled();
		wrapper.unmount();
	});

	it('shows the ?error= from the OAuth redirect as an alert', async () => {
		const { wrapper } = await mountLogin('/login?error=No_user_registered_with_this_GitHub_account.');

		expect(wrapper.text()).toContain('No user registered with this GitHub account.');
		await buttonByText(wrapper, 'Dismiss').trigger('click');
		expect(wrapper.text()).not.toContain('No user registered with this GitHub account.');
		wrapper.unmount();
	});

	it('flags an invalid email', async () => {
		const { wrapper } = await mountLogin();

		const email = wrapper.find('[data-testid="login-email-input"]');
		await email.setValue('not-an-email');
		await email.trigger('blur');

		expect(wrapper.text()).toContain('Invalid email format.');
		wrapper.unmount();
	});

	it('links to the password reset page', async () => {
		const { wrapper } = await mountLogin();
		expect(wrapper.find('[data-testid="forgot-password-link"]').attributes('href')).toBe('/forget-password');
		wrapper.unmount();
	});
});
