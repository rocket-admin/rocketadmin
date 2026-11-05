import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountAuthView } from './authTestUtils';
import EmailChangeView from './EmailChangeView.vue';

const user = vi.hoisted(() => ({ changeEmail: vi.fn(), fetchUser: vi.fn() }));
vi.mock('@/stores/user', () => ({ useUserStore: () => user }));

const PATTERN = '/external/user/email/change/verify/:changeToken';
const mountPage = () => mountAuthView(EmailChangeView, PATTERN, '/external/user/email/change/verify/change-1');

describe('EmailChangeView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('changes the email, reloads the user and goes to /user-settings', async () => {
		user.changeEmail.mockResolvedValue({});
		user.fetchUser.mockResolvedValue({});
		const { wrapper, router } = await mountPage();

		expect(wrapper.find('[data-testid="email-change-button"]').attributes('disabled')).toBeDefined();
		await wrapper.find('[data-testid="email-change-input"]').setValue('new@example.com');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(user.changeEmail).toHaveBeenCalledWith('change-1', 'new@example.com');
		expect(user.fetchUser).toHaveBeenCalled();
		expect(router.currentRoute.value.path).toBe('/user-settings');
		wrapper.unmount();
	});

	it('validates the email', async () => {
		const { wrapper } = await mountPage();
		const input = wrapper.find('[data-testid="email-change-input"]');

		await input.trigger('blur');
		expect(wrapper.text()).toContain('Cannot be not empty.');
		await input.setValue('nope');
		expect(wrapper.text()).toContain('Invalid email format.');
		expect(wrapper.find('[data-testid="email-change-button"]').attributes('disabled')).toBeDefined();
		wrapper.unmount();
	});

	it('stays on the page when the change fails', async () => {
		user.changeEmail.mockRejectedValue(new Error('taken'));
		const { wrapper, router } = await mountPage();

		await wrapper.find('[data-testid="email-change-input"]').setValue('new@example.com');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(user.fetchUser).not.toHaveBeenCalled();
		expect(router.currentRoute.value.path).toBe('/external/user/email/change/verify/change-1');
		expect(wrapper.find('[data-testid="email-change-button"]').attributes('disabled')).toBeUndefined();
		wrapper.unmount();
	});
});
