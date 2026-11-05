import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buttonByText, mountAuthView } from './authTestUtils';
import ForgetPasswordView from './ForgetPasswordView.vue';

const auth = vi.hoisted(() => ({ fetchUserCompanies: vi.fn() }));
const user = vi.hoisted(() => ({ requestPasswordReset: vi.fn() }));
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }));
vi.mock('@/stores/user', () => ({ useUserStore: () => user }));

const mountPage = () => mountAuthView(ForgetPasswordView, '/forget-password');

describe('ForgetPasswordView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		user.requestPasswordReset.mockResolvedValue({});
	});

	it('looks up the companies, then requests the reset for the only one', async () => {
		auth.fetchUserCompanies.mockResolvedValue([{ id: 'company_1111', name: 'South Park' }]);
		const { wrapper } = await mountPage();

		expect(wrapper.find('h1').text()).toBe('Forgot your password?');
		expect(buttonByText(wrapper, 'Next').attributes('disabled')).toBeDefined();
		await wrapper.find('[data-testid="forget-password-email-input"]').setValue('eric@cartman.ass');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(auth.fetchUserCompanies).toHaveBeenCalledWith('eric@cartman.ass');
		expect(wrapper.find('[data-testid="forget-password-next-button"]').exists()).toBe(false);
		expect(buttonByText(wrapper, 'Reset my password').attributes('disabled')).toBeUndefined();

		await wrapper.find('form').trigger('submit');
		await flushPromises();
		expect(user.requestPasswordReset).toHaveBeenCalledWith('eric@cartman.ass', 'company_1111');
		wrapper.unmount();
	});

	it('asks to pick a company when there are several', async () => {
		auth.fetchUserCompanies.mockResolvedValue([
			{ id: 'c1', name: 'South Park' },
			{ id: 'c2', name: 'North Park' },
		]);
		const { wrapper } = await mountPage();

		await wrapper.find('[data-testid="forget-password-email-input"]').setValue('eric@cartman.ass');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(wrapper.find('[data-testid="forget-password-next-button"]').exists()).toBe(false);
		expect(buttonByText(wrapper, 'Reset my password').attributes('disabled')).toBeDefined();
		const select = wrapper.find('select');
		const option = select.findAll('option').find((candidate) => candidate.text() === 'North Park');
		await select.setValue(option?.attributes('value'));
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(user.requestPasswordReset).toHaveBeenCalledWith('eric@cartman.ass', 'c2');
		wrapper.unmount();
	});

	it('flags an invalid email', async () => {
		const { wrapper } = await mountPage();
		const input = wrapper.find('[data-testid="forget-password-email-input"]');
		await input.setValue('nope');
		await input.trigger('blur');
		expect(wrapper.text()).toContain('Invalid email format.');
		wrapper.unmount();
	});
});
