// Port of AuthService plus the session handling that lived in AppComponent: the `token_expiration`
// bookkeeping, the logout timer and the redirects after login and logout.
//
// The session itself is an httpOnly cookie; the client only keeps its expiry in localStorage.
import * as Sentry from '@sentry/vue';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api/client';
import { getConfig } from '@/config';
import { environment } from '@/environment';
import type { ExistingAuthUser } from '@/models/user';
import { router } from '@/router';

export const TOKEN_EXPIRATION_KEY = 'token_expiration';

/** What /user/login and the other sign-in endpoints answer with. */
export interface AuthResponse {
	expires?: string | number;
	/** true when a second factor is still required (`/user/otp/login`). */
	isTemporary?: boolean;
	[key: string]: unknown;
}

export interface CompanyOption {
	id: string;
	name: string;
}

export function readTokenExpiration(): Date | null {
	const raw = localStorage.getItem(TOKEN_EXPIRATION_KEY);
	if (!raw) return null;
	const date = new Date(raw);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function hasValidSessionToken(now = Date.now()): boolean {
	const expiration = readTokenExpiration();
	return expiration !== null && expiration.getTime() > now;
}

export const useAuthStore = defineStore('auth', () => {
	const isAuthenticated = ref(hasValidSessionToken());
	let expiryTimer: ReturnType<typeof setTimeout> | null = null;

	function setAuthenticated(value: boolean): void {
		isAuthenticated.value = value;
	}

	function scheduleExpiry(expiration: Date): void {
		if (expiryTimer) clearTimeout(expiryTimer);
		const interval = expiration.getTime() - Date.now();
		// setTimeout overflows past ~24.8 days and fires at once; such a session just outlives the tab.
		if (interval > 2 ** 31 - 1) return;
		expiryTimer = setTimeout(() => {
			logOut(true).finally(() => router.push('/login'));
		}, interval);
	}

	/**
	 * Called with every sign-in response (AppComponent's `auth.cast` subscription). A temporary
	 * response means 2FA is still pending, so no session starts. Returns whether one did.
	 */
	function startSession(response: AuthResponse): boolean {
		if (response.isTemporary || !response.expires) return false;
		const expiration = new Date(response.expires);
		if (Number.isNaN(expiration.getTime())) return false;

		localStorage.setItem(TOKEN_EXPIRATION_KEY, expiration.toISOString());
		setAuthenticated(true);
		scheduleExpiry(expiration);
		router.push('/connections-list');
		return true;
	}

	/**
	 * Run once on boot. Takes `?expires=<ms>` from OAuth redirects, then either restores the stored
	 * session (and its logout timer) or, when it has expired, clears it. Returns whether the user is
	 * signed in.
	 */
	function restoreSession(search = location.search): boolean {
		const expiresFromUrl = new URLSearchParams(search).get('expires');
		if (expiresFromUrl) {
			const date = new Date(Number.parseInt(expiresFromUrl, 10));
			if (!Number.isNaN(date.getTime())) localStorage.setItem(TOKEN_EXPIRATION_KEY, date.toISOString());
		}

		const expiration = readTokenExpiration();
		if (!expiration) {
			setAuthenticated(false);
			return false;
		}
		if (expiration.getTime() > Date.now()) {
			setAuthenticated(true);
			scheduleExpiry(expiration);
			return true;
		}
		clearSession();
		return false;
	}

	function clearSession(): void {
		if (expiryTimer) clearTimeout(expiryTimer);
		expiryTimer = null;
		localStorage.removeItem(TOKEN_EXPIRATION_KEY);
		setAuthenticated(false);
	}

	async function withSession(promise: Promise<AuthResponse>): Promise<AuthResponse> {
		const response = await promise;
		startSession(response);
		return response;
	}

	function loginUser(userData: ExistingAuthUser): Promise<AuthResponse> {
		const body: Partial<ExistingAuthUser> = { ...userData };
		if (body.companyId === '') delete body.companyId;
		return withSession(api.post<AuthResponse>('/user/login', body, { notify: 'alert' }));
	}

	function loginWith2FA(code: string): Promise<AuthResponse> {
		return withSession(api.post<AuthResponse>('/user/otp/login', { otpToken: code }, { notify: 'alert' }));
	}

	async function loginWithGoogle(token: string): Promise<AuthResponse> {
		try {
			return await withSession(
				api.post<AuthResponse>(`${getConfig().saasURL}/saas/user/google/login`, { token }, { notify: 'alert' }),
			);
		} catch (error) {
			Sentry.captureException(error);
			throw error;
		}
	}

	function loginWithGithub(): void {
		location.assign(`${getConfig().saasURL}/saas/user/github/login/request`);
	}

	function requestEmailVerifications(): Promise<unknown> {
		return api.get('/user/email/verify/request', {
			notify: 'alert',
			successMessage: 'Confirmation email has been sent.',
		});
	}

	function verifyEmail(token: string): Promise<AuthResponse> {
		return withSession(
			api.get<AuthResponse>(`/user/email/verify/${token}`, {
				notify: 'alert',
				successMessage: 'Your email is verified.',
			}),
		);
	}

	function fetchUserCompanies(email: string): Promise<CompanyOption[]> {
		return api.get<CompanyOption[]>(`/company/my/email/${email}`, { notify: 'alert' });
	}

	function checkInvitationAvailability(token: string): Promise<unknown> {
		return api.get(`/company/invite/verify/${token}`, { notify: 'alert' });
	}

	function acceptCompanyInvitation(token: string, password: string, userName: string): Promise<AuthResponse> {
		return withSession(
			api.post<AuthResponse>(`/company/invite/verify/${token}`, { password, userName }, { notify: 'alert' }),
		);
	}

	/**
	 * Port of AppComponent.logOut. An expired session in SaaS stays on the page (the caller goes to
	 * /login); a deliberate SaaS logout leaves for the marketing site.
	 */
	async function logOut(isTokenExpired = false, email?: string): Promise<void> {
		revokeGoogleConsent(email);
		await api.post('/user/logout', undefined, { notify: 'snackbar', successMessage: 'User is logged out.' });
		clearSession();
		if (environment.saas) {
			if (!isTokenExpired) location.href = 'https://rocketadmin.com/';
		} else {
			await router.push('/login');
		}
	}

	return {
		isAuthenticated,
		setAuthenticated,
		startSession,
		restoreSession,
		clearSession,
		loginUser,
		loginWith2FA,
		loginWithGoogle,
		loginWithGithub,
		requestEmailVerifications,
		verifyEmail,
		fetchUserCompanies,
		checkInvitationAvailability,
		acceptCompanyInvitation,
		logOut,
	};
});

interface GoogleIdentity {
	accounts?: { id?: { revoke?: (hint: string, callback: () => void) => void } };
}

function revokeGoogleConsent(email: string | undefined): void {
	if (!email) return;
	const google = (window as unknown as { google?: GoogleIdentity }).google;
	try {
		google?.accounts?.id?.revoke?.(email, () => {});
	} catch (error) {
		console.log('google error', error);
	}
}
