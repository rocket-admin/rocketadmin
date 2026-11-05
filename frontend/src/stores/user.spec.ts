import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api/client';
import { AlertType } from '@/models/alert';
import { CompanyMemberRole } from '@/models/company';
import { SubscriptionPlans } from '@/models/user';
import { router } from '@/router';
import { useNotificationsStore } from '@/stores/notifications';
import { type CurrentUser, useUserStore } from './user';

vi.mock('@/api/client', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('@/router', () => ({ router: { push: vi.fn(async () => undefined) } }));

const get = vi.mocked(api.get);
const post = vi.mocked(api.post);
const put = vi.mocked(api.put);
const del = vi.mocked(api.delete);
const push = vi.mocked(router.push);

const user: CurrentUser = {
	id: 'user-1',
	isActive: true,
	email: 'eric@south.park',
	createdAt: '2021-07-21T14:35:17.270Z',
	subscriptionLevel: SubscriptionPlans.free,
	is_2fa_enabled: false,
	role: CompanyMemberRole.CAO,
	externalRegistrationProvider: null,
	company: { id: 'company-1' },
	intercom_hash: 'hash',
};

describe('user store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('starts without a user and keeps the one fetchUser() loads', async () => {
		get.mockResolvedValueOnce(user);
		const store = useUserStore();
		expect(store.currentUser).toBeNull();

		await expect(store.fetchUser()).resolves.toEqual(user);

		expect(get).toHaveBeenCalledWith('/user', { notify: 'snackbar' });
		expect(store.currentUser?.intercom_hash).toBe('hash');
	});

	it('keeps no user when fetchUser fails', async () => {
		get.mockRejectedValueOnce(new Error('boom'));
		const store = useUserStore();

		await expect(store.fetchUser()).rejects.toThrow('boom');
		expect(store.currentUser).toBeNull();
	});

	it('sends user actions silently and swallows their failures', async () => {
		post.mockRejectedValueOnce(new Error('offline'));
		vi.spyOn(console, 'log').mockImplementation(() => {});

		await expect(useUserStore().sendUserAction('CONNECTION_CREATION_NOT_FINISHED')).resolves.toBeNull();
		expect(post).toHaveBeenCalledWith('/action', { message: 'CONNECTION_CREATION_NOT_FINISHED' }, { notify: false });
	});

	it('shows an info alert after requesting an email change', async () => {
		get.mockResolvedValueOnce({});
		await useUserStore().requestEmailChange();

		expect(get).toHaveBeenCalledWith('/user/email/change/request', { notify: 'alert' });
		const alert = useNotificationsStore().alert;
		expect(alert?.type).toBe(AlertType.Info);
		expect(alert?.message).toBe('Link has been sent to your email. Please check it.');
		expect(alert?.actions?.[0]?.caption).toBe('Dismiss');
	});

	it('shows no alert when the email change request fails', async () => {
		get.mockRejectedValueOnce(new Error('fail'));
		await expect(useUserStore().requestEmailChange()).rejects.toThrow();
		expect(useNotificationsStore().alert).toBeNull();
	});

	it('changes the email', async () => {
		post.mockResolvedValueOnce({});
		await useUserStore().changeEmail('token', 'new@south.park');
		expect(post).toHaveBeenCalledWith(
			'/user/email/change/verify/token',
			{ email: 'new@south.park' },
			{ notify: 'alert', successMessage: 'You email has been changed successfully.' },
		);
	});

	it('shows a success alert after requesting a password reset', async () => {
		post.mockResolvedValueOnce({});
		await useUserStore().requestPasswordReset('eric@south.park', 'company-1');

		expect(post).toHaveBeenCalledWith(
			'/user/password/reset/request',
			{ email: 'eric@south.park', companyId: 'company-1' },
			{ notify: 'alert' },
		);
		expect(useNotificationsStore().alert).toMatchObject({ type: AlertType.Success, message: 'Check your email.' });
	});

	it('resets and changes the password', async () => {
		post.mockResolvedValue({});
		const store = useUserStore();

		await store.resetPassword('token', 'new-pw');
		await store.changePassword('old-pw', 'new-pw', 'eric@south.park');

		expect(post).toHaveBeenCalledWith(
			'/user/password/reset/verify/token',
			{ password: 'new-pw' },
			{ notify: 'alert', successMessage: 'Your password has been reset successfully.' },
		);
		expect(post).toHaveBeenCalledWith(
			'/user/password/change/',
			{ email: 'eric@south.park', oldPassword: 'old-pw', newPassword: 'new-pw' },
			{ notify: 'alert', successMessage: 'Your password has been changed successfully.' },
		);
	});

	it('changes the user name with snackbar errors', async () => {
		put.mockResolvedValueOnce({});
		await useUserStore().changeUserName('Eric');
		expect(put).toHaveBeenCalledWith(
			'/user/name',
			{ name: 'Eric' },
			{ notify: 'snackbar', successMessage: 'Your name has been changed successfully.' },
		);
	});

	it('turns 2FA on and off', async () => {
		post.mockResolvedValueOnce({ qrCode: 'data:image/png' }).mockResolvedValue({ validated: true });
		const store = useUserStore();

		await expect(store.switchOn2FA()).resolves.toEqual({ qrCode: 'data:image/png' });
		await store.confirm2FA('123456');
		await store.switchOff2FA('654321');

		expect(post).toHaveBeenCalledWith('/user/otp/generate', {}, { notify: 'snackbar' });
		expect(post).toHaveBeenCalledWith(
			'/user/otp/verify',
			{ otpToken: '123456' },
			{ notify: 'snackbar', successMessage: '2FA is turned on successfully.' },
		);
		expect(post).toHaveBeenCalledWith(
			'/user/otp/disable',
			{ otpToken: '654321' },
			{ notify: 'snackbar', successMessage: '2FA is turned off successfully.' },
		);
	});

	it('rejects when the 2FA code is wrong, so the dialog can stay open', async () => {
		post.mockRejectedValueOnce(new Error('Invalid token'));
		await expect(useUserStore().confirm2FA('000000')).rejects.toThrow('Invalid token');
	});

	it('lists, generates and deletes API keys', async () => {
		get.mockResolvedValueOnce([{ id: 'k1', title: 'CI' }]);
		post.mockResolvedValueOnce({ id: 'k2', title: 'Zapier', hash: 'secret' });
		del.mockResolvedValueOnce({});
		const store = useUserStore();

		await expect(store.getAPIkeys()).resolves.toEqual([{ id: 'k1', title: 'CI' }]);
		await store.generateAPIkey('Zapier');
		await store.deleteAPIkey({ id: 'k1', title: 'CI' });

		expect(get).toHaveBeenCalledWith('/apikeys', { notify: 'alert' });
		expect(post).toHaveBeenCalledWith(
			'/apikey',
			{ title: 'Zapier' },
			{ notify: 'snackbar', successMessage: 'Zapier key is generated successfully.' },
		);
		expect(del).toHaveBeenCalledWith('/apikey/k1', {
			notify: 'snackbar',
			successMessage: 'CI API key is deleted successfully.',
		});
	});

	it('deletes the account: notifies listeners, forgets the user, then goes to /deleted', async () => {
		get.mockResolvedValueOnce(user);
		put.mockResolvedValueOnce({});
		const store = useUserStore();
		await store.fetchUser();
		const order: string[] = [];
		const listener = vi.fn(() => order.push('listener'));
		push.mockImplementationOnce(() => {
			order.push('navigate');
			return Promise.resolve();
		});
		store.onAccountDeleted(listener);

		await store.deleteAccount({ reason: 'missing-features', message: 'bye' });

		expect(put).toHaveBeenCalledWith(
			'/user/delete',
			{ reason: 'missing-features', message: 'bye' },
			{ notify: 'alert' },
		);
		expect(listener).toHaveBeenCalledOnce();
		expect(order).toEqual(['listener', 'navigate']);
		expect(push).toHaveBeenCalledWith('/deleted');
		expect(store.currentUser).toBeNull();
	});

	it('does not notify listeners or navigate when the deletion fails', async () => {
		put.mockRejectedValueOnce(new Error('nope'));
		const store = useUserStore();
		const listener = vi.fn();
		store.onAccountDeleted(listener);

		await expect(store.deleteAccount({})).rejects.toThrow('nope');
		expect(listener).not.toHaveBeenCalled();
		expect(push).not.toHaveBeenCalled();
	});

	it('stops calling a listener once unsubscribed', async () => {
		put.mockResolvedValueOnce({});
		const store = useUserStore();
		const listener = vi.fn();
		const unsubscribe = store.onAccountDeleted(listener);
		unsubscribe();

		await store.deleteAccount({});
		expect(listener).not.toHaveBeenCalled();
	});
});
