import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import AccountDeleteDialog from '@/components/user-settings/AccountDeleteDialog.vue';
import EnableTwoFaDialog from '@/components/user-settings/EnableTwoFaDialog.vue';
import { CompanyMemberRole } from '@/models/company';
import { type RegistrationProvider, SubscriptionPlans, type User } from '@/models/user';
import { buttonByText, mountAuthView } from '@/views/auth/authTestUtils';
import UserSettingsView from './UserSettingsView.vue';

const user = vi.hoisted(() => ({
	currentUser: null as unknown,
	fetchUser: vi.fn(),
	requestEmailChange: vi.fn(),
	changeUserName: vi.fn(),
	switchOn2FA: vi.fn(),
	switchOff2FA: vi.fn(),
}));
const auth = vi.hoisted(() => ({ requestEmailVerifications: vi.fn() }));
const open = vi.hoisted(() => vi.fn());
const trackAuthEvent = vi.hoisted(() => vi.fn());

vi.mock('@/stores/user', () => ({ useUserStore: () => reactive(user) }));
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }));
vi.mock('@/stores/ui-settings', () => ({
	useUiSettingsStore: () => ({ getUiSettings: () => Promise.resolve(null), updateGlobalSetting: vi.fn() }),
}));
vi.mock('@/composables/useDialog', () => ({ useDialog: () => ({ open }) }));
vi.mock('@/components/auth/analytics', () => ({ trackAuthEvent }));

function makeUser(overrides: Partial<User> = {}): User {
	return {
		id: 'user-12345678',
		createdAt: '2021-10-01T13:43:02.034Z',
		isActive: true,
		email: 'user@test.com',
		name: 'Eric',
		subscriptionLevel: SubscriptionPlans.free,
		is_2fa_enabled: false,
		role: CompanyMemberRole.Member,
		externalRegistrationProvider: null,
		company: { id: 'company_123' },
		...overrides,
	};
}

const mountPage = () => mountAuthView(UserSettingsView, '/user-settings');
const toggle = (wrapper: Awaited<ReturnType<typeof mountPage>>['wrapper']) =>
	wrapper.find('[data-testid="two-fa-toggle"]');

describe('UserSettingsView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		user.currentUser = makeUser();
		user.requestEmailChange.mockResolvedValue({ message: 'requested' });
		user.changeUserName.mockResolvedValue({});
		open.mockReturnValue({ afterClosed: () => Promise.resolve('enable') });
	});

	it('shows the account and sets the title', async () => {
		const { wrapper } = await mountPage();
		expect(document.title).toBe('Account settings | Rocketadmin');
		expect(wrapper.text()).toContain('user@test.com');
		expect((wrapper.find('[data-testid="user-name-input"]').element as HTMLInputElement).value).toBe('Eric');
		expect(wrapper.find('[data-testid="change-user-password-link"]').attributes('href')).toBe('/change-password');
		wrapper.unmount();
	});

	it('requests an email change', async () => {
		const { wrapper } = await mountPage();
		await wrapper.find('[data-testid="user-settings__button"]').trigger('click');
		await flushPromises();

		expect(user.requestEmailChange).toHaveBeenCalled();
		expect(trackAuthEvent).toHaveBeenCalledWith('User settings: email change request is sent successfully');
		wrapper.unmount();
	});

	it('saves the name once it was edited', async () => {
		const { wrapper } = await mountPage();
		const save = () => wrapper.find('[data-testid="save-user-name-button"]');
		expect(save().attributes('disabled')).toBeDefined();

		await wrapper.find('[data-testid="user-name-input"]').setValue('Kyle');
		expect(save().attributes('disabled')).toBeUndefined();
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(user.changeUserName).toHaveBeenCalledWith('Kyle');
		wrapper.unmount();
	});

	it('opens the delete account dialog with the current user', async () => {
		const { wrapper } = await mountPage();
		await buttonByText(wrapper, 'Delete account').trigger('click');

		expect(open).toHaveBeenCalledWith(AccountDeleteDialog, { data: makeUser() });
		wrapper.unmount();
	});

	it('hides email and password changes for external sign-ups, and 2FA for GitHub', async () => {
		user.currentUser = makeUser({ externalRegistrationProvider: 'GITHUB' as RegistrationProvider });
		const { wrapper } = await mountPage();

		expect(wrapper.find('[data-testid="user-settings__button"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="change-user-password-link"]').exists()).toBe(false);
		expect(toggle(wrapper).exists()).toBe(false);
		wrapper.unmount();
	});

	it('warns about an unconfirmed email and resends the confirmation', async () => {
		user.currentUser = makeUser({ isActive: false });
		auth.requestEmailVerifications.mockResolvedValue({});
		const { wrapper } = await mountPage();

		expect(wrapper.text()).toContain('Your email address is not confirmed.');
		expect(toggle(wrapper).attributes('disabled')).toBeDefined();
		await buttonByText(wrapper, 'Resend confirmation').trigger('click');
		expect(auth.requestEmailVerifications).toHaveBeenCalled();
		wrapper.unmount();
	});

	it('turning 2FA on opens the QR dialog and stays on when it is enabled', async () => {
		user.switchOn2FA.mockResolvedValue({ qrCode: 'data:qr' });
		const { wrapper } = await mountPage();
		await toggle(wrapper).setValue(true);
		await flushPromises();

		expect(open).toHaveBeenCalledWith(EnableTwoFaDialog, { data: 'data:qr' });
		expect((toggle(wrapper).element as HTMLInputElement).checked).toBe(true);
		wrapper.unmount();
	});

	it('turning 2FA on flips back off when the dialog is dismissed', async () => {
		user.switchOn2FA.mockResolvedValue({ qrCode: 'data:qr' });
		open.mockReturnValue({ afterClosed: () => Promise.resolve(undefined) });
		const { wrapper } = await mountPage();
		await toggle(wrapper).setValue(true);
		await flushPromises();

		expect((toggle(wrapper).element as HTMLInputElement).checked).toBe(false);
		wrapper.unmount();
	});

	it('turning 2FA off asks for a code and disables it', async () => {
		user.currentUser = makeUser({ is_2fa_enabled: true });
		user.switchOff2FA.mockResolvedValue({ disabled: true });
		const { wrapper } = await mountPage();
		await toggle(wrapper).setValue(false);

		await wrapper.find('input[name="code"]').setValue('123456');
		await buttonByText(wrapper, 'Disable').trigger('submit');
		await wrapper.findAll('form')[1]?.trigger('submit');
		await flushPromises();

		expect(user.switchOff2FA).toHaveBeenCalledWith('123456');
		expect(trackAuthEvent).toHaveBeenCalledWith('User settings: 2fa disabled successfully');
		expect(wrapper.find('input[name="code"]').exists()).toBe(false);
		wrapper.unmount();
	});
});
