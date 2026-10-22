import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { mountAuthView } from './authTestUtils';
import PasswordChangeView from './PasswordChangeView.vue';

const user = vi.hoisted(() => ({
	currentUser: null as { email: string } | null,
	fetchUser: vi.fn(),
	changePassword: vi.fn(),
}));
const trackAuthEvent = vi.hoisted(() => vi.fn());
vi.mock('@/stores/user', () => ({ useUserStore: () => reactive(user) }));
vi.mock('@/components/auth/analytics', () => ({ trackAuthEvent }));
vi.mock('@/lib/password-strength', () => ({ loadPasswordScorer: () => new Promise(() => {}) }));

const mountPage = () => mountAuthView(PasswordChangeView, '/change-password');

async function fillForm(wrapper: Awaited<ReturnType<typeof mountPage>>['wrapper']) {
	await wrapper.find('[data-testid="password-change-old-input"]').setValue('OldPass123');
	await wrapper.find('input[name="password"]').setValue('NewPass123');
}

describe('PasswordChangeView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		user.currentUser = { email: 'eric@cartman.ass' };
		user.changePassword.mockResolvedValue({});
	});

	it('changes the password for the current user and goes to /user-settings', async () => {
		const { wrapper, router } = await mountPage();
		const button = wrapper.find('[data-testid="password-change-button"]');
		expect(button.attributes('disabled')).toBeDefined();

		await fillForm(wrapper);
		expect(wrapper.find('[data-testid="password-change-button"]').attributes('disabled')).toBeUndefined();
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(user.changePassword).toHaveBeenCalledWith('OldPass123', 'NewPass123', 'eric@cartman.ass');
		expect(trackAuthEvent).toHaveBeenCalledWith('Manual password change: password updated successfully');
		expect(router.currentRoute.value.path).toBe('/user-settings');
		wrapper.unmount();
	});

	it('requires the old password', async () => {
		const { wrapper } = await mountPage();
		const old = wrapper.find('[data-testid="password-change-old-input"]');
		await old.trigger('blur');
		expect(wrapper.text()).toContain('Password can not be empty.');
		wrapper.unmount();
	});

	it('loads the user when it is not known yet', async () => {
		user.currentUser = null;
		user.fetchUser.mockResolvedValue({ email: 'kyle@broflovski.org' });
		const { wrapper } = await mountPage();

		expect(user.fetchUser).toHaveBeenCalled();
		await fillForm(wrapper);
		await wrapper.find('form').trigger('submit');
		await flushPromises();
		expect(user.changePassword).toHaveBeenCalledWith('OldPass123', 'NewPass123', 'kyle@broflovski.org');
		wrapper.unmount();
	});

	it('links back to the user settings', async () => {
		const { wrapper } = await mountPage();
		const back = wrapper.findAll('a').find((link) => link.text() === 'Back');
		expect(back?.attributes('href')).toBe('/user-settings');
		wrapper.unmount();
	});
});
