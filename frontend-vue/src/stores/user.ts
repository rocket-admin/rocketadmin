// Port of frontend/src/app/services/user.service.ts: the signed-in user and the account endpoints
// (email, password, name, 2FA, API keys, account deletion).
//
// Angular pushed the string 'delete' through `user.cast` after an account deletion and AppComponent
// logged out on it. Here that is an explicit hook: the shell calls `onAccountDeleted(callback)` once
// and gets called before the router leaves for /deleted.
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api/client';
import { AlertActionType, AlertType } from '@/models/alert';
import type { ApiKey, User } from '@/models/user';
import { router } from '@/router';
import { useNotificationsStore } from '@/stores/notifications';

/** What GET /user answers with: the User model plus the Intercom identity hash (SaaS). */
export interface CurrentUser extends User {
	intercom_hash?: string;
}

/** POST /user/otp/generate: the QR code the enable-2FA dialog shows. */
export interface TwoFactorSetup {
	qrCode: string;
}

/** POST /apikey: the new key, whose secret `hash` is shown once. */
export interface ApiKeyWithSecret extends ApiKey {
	hash?: string;
}

/** Body of PUT /user/delete: the reason survey from the delete-account dialog. */
export type DeleteAccountMetadata = Record<string, unknown>;

export type AccountDeletedListener = () => void;

export const useUserStore = defineStore('user', () => {
	/** null until fetchUser() resolves (Angular started from a blank `initialUserState`). */
	const currentUser = ref<CurrentUser | null>(null);
	const accountDeletedListeners = new Set<AccountDeletedListener>();

	async function fetchUser(): Promise<CurrentUser> {
		const user = await api.get<CurrentUser>('/user', { notify: 'snackbar' });
		currentUser.value = user;
		return user;
	}

	/** Fire-and-forget product analytics; Angular swallowed every failure silently. */
	async function sendUserAction(message: string): Promise<unknown> {
		try {
			return await api.post('/action', { message }, { notify: false });
		} catch (error) {
			console.log(error);
			return null;
		}
	}

	async function requestEmailChange(): Promise<unknown> {
		const response = await api.get('/user/email/change/request', { notify: 'alert' });
		showDismissibleAlert(AlertType.Info, 'Link has been sent to your email. Please check it.');
		return response;
	}

	function changeEmail(token: string, newEmail: string): Promise<unknown> {
		return api.post(
			`/user/email/change/verify/${token}`,
			{ email: newEmail },
			{ notify: 'alert', successMessage: 'You email has been changed successfully.' },
		);
	}

	async function requestPasswordReset(email: string, companyId: string): Promise<unknown> {
		const response = await api.post('/user/password/reset/request', { email, companyId }, { notify: 'alert' });
		showDismissibleAlert(AlertType.Success, 'Check your email.');
		return response;
	}

	function resetPassword(token: string, newPassword: string): Promise<unknown> {
		return api.post(
			`/user/password/reset/verify/${token}`,
			{ password: newPassword },
			{ notify: 'alert', successMessage: 'Your password has been reset successfully.' },
		);
	}

	function changePassword(oldPassword: string, newPassword: string, email: string): Promise<unknown> {
		return api.post(
			'/user/password/change/',
			{ email, oldPassword, newPassword },
			{ notify: 'alert', successMessage: 'Your password has been changed successfully.' },
		);
	}

	function changeUserName(userName: string): Promise<unknown> {
		return api.put(
			'/user/name',
			{ name: userName },
			{ notify: 'snackbar', successMessage: 'Your name has been changed successfully.' },
		);
	}

	function switchOn2FA(): Promise<TwoFactorSetup> {
		return api.post<TwoFactorSetup>('/user/otp/generate', {}, { notify: 'snackbar' });
	}

	/** Rejects on failure (Angular rethrew here too) so the dialog can keep the code input open. */
	function confirm2FA(code: string): Promise<unknown> {
		return api.post(
			'/user/otp/verify',
			{ otpToken: code },
			{ notify: 'snackbar', successMessage: '2FA is turned on successfully.' },
		);
	}

	function switchOff2FA(code: string): Promise<unknown> {
		return api.post(
			'/user/otp/disable',
			{ otpToken: code },
			{ notify: 'snackbar', successMessage: '2FA is turned off successfully.' },
		);
	}

	function getAPIkeys(): Promise<ApiKey[]> {
		return api.get<ApiKey[]>('/apikeys', { notify: 'alert' });
	}

	function generateAPIkey(title: string): Promise<ApiKeyWithSecret> {
		return api.post<ApiKeyWithSecret>(
			'/apikey',
			{ title },
			{ notify: 'snackbar', successMessage: `${title} key is generated successfully.` },
		);
	}

	function deleteAPIkey(apiKey: ApiKey): Promise<unknown> {
		return api.delete(`/apikey/${apiKey.id}`, {
			notify: 'snackbar',
			successMessage: `${apiKey.title} API key is deleted successfully.`,
		});
	}

	async function deleteAccount(metadata: DeleteAccountMetadata): Promise<void> {
		await api.put('/user/delete', metadata, { notify: 'alert' });
		currentUser.value = null;
		for (const listener of accountDeletedListeners) listener();
		await router.push('/deleted');
	}

	/**
	 * Replaces `user.cast` emitting 'delete'. The listener runs after PUT /user/delete succeeds and
	 * before navigating to /deleted (AppComponent called `logOut(true)` there). Returns an unsubscribe.
	 */
	function onAccountDeleted(listener: AccountDeletedListener): () => void {
		accountDeletedListeners.add(listener);
		return () => accountDeletedListeners.delete(listener);
	}

	function clearUser(): void {
		currentUser.value = null;
	}

	return {
		currentUser,
		fetchUser,
		clearUser,
		sendUserAction,
		requestEmailChange,
		changeEmail,
		requestPasswordReset,
		resetPassword,
		changePassword,
		changeUserName,
		switchOn2FA,
		confirm2FA,
		switchOff2FA,
		getAPIkeys,
		generateAPIkey,
		deleteAPIkey,
		deleteAccount,
		onAccountDeleted,
	};
});

function showDismissibleAlert(type: AlertType, message: string): void {
	const notifications = useNotificationsStore();
	notifications.showAlert(type, message, [
		{ type: AlertActionType.Button, caption: 'Dismiss', action: () => notifications.dismissAlert() },
	]);
}
