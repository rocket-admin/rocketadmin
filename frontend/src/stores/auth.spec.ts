import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api/client';
import { router } from '@/router';
import { hasValidSessionToken, TOKEN_EXPIRATION_KEY, useAuthStore } from './auth';

vi.mock('@/api/client', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/router', () => ({ router: { push: vi.fn(async () => undefined) } }));
vi.mock('@/environment', () => ({ environment: { saas: false } }));

const post = vi.mocked(api.post);
const push = vi.mocked(router.push);

const inAnHour = () => new Date(Date.now() + 3_600_000).toISOString();

describe('auth store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		localStorage.clear();
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('reads the session from token_expiration', () => {
		expect(hasValidSessionToken()).toBe(false);
		localStorage.setItem(TOKEN_EXPIRATION_KEY, inAnHour());
		expect(hasValidSessionToken()).toBe(true);
		localStorage.setItem(TOKEN_EXPIRATION_KEY, new Date(Date.now() - 1000).toISOString());
		expect(hasValidSessionToken()).toBe(false);
		localStorage.setItem(TOKEN_EXPIRATION_KEY, 'garbage');
		expect(hasValidSessionToken()).toBe(false);
	});

	it('starts a session after login and goes to the connections list', async () => {
		const expires = inAnHour();
		post.mockResolvedValueOnce({ expires });
		const auth = useAuthStore();

		await auth.loginUser({ email: 'a@b.c', password: 'pw', companyId: '' });

		expect(post).toHaveBeenCalledWith('/user/login', { email: 'a@b.c', password: 'pw' }, { notify: 'alert' });
		expect(localStorage.getItem(TOKEN_EXPIRATION_KEY)).toBe(expires);
		expect(auth.isAuthenticated).toBe(true);
		expect(push).toHaveBeenCalledWith('/connections-list');
	});

	it('does not start a session while 2FA is pending', async () => {
		post.mockResolvedValueOnce({ expires: inAnHour(), isTemporary: true });
		const auth = useAuthStore();

		await auth.loginUser({ email: 'a@b.c', password: 'pw', companyId: 'c1' });

		expect(auth.isAuthenticated).toBe(false);
		expect(localStorage.getItem(TOKEN_EXPIRATION_KEY)).toBeNull();
		expect(push).not.toHaveBeenCalled();
	});

	it('restores the session from ?expires= after an OAuth redirect', () => {
		const expires = Date.now() + 3_600_000;
		const auth = useAuthStore();

		expect(auth.restoreSession(`?expires=${expires}`)).toBe(true);
		expect(new Date(localStorage.getItem(TOKEN_EXPIRATION_KEY) ?? '').getTime()).toBe(expires);
		expect(auth.isAuthenticated).toBe(true);
	});

	it('clears an expired session on restore', () => {
		localStorage.setItem(TOKEN_EXPIRATION_KEY, new Date(Date.now() - 1000).toISOString());
		const auth = useAuthStore();

		expect(auth.restoreSession('')).toBe(false);
		expect(localStorage.getItem(TOKEN_EXPIRATION_KEY)).toBeNull();
	});

	it('logs out when the session expires', async () => {
		post.mockResolvedValue(undefined);
		localStorage.setItem(TOKEN_EXPIRATION_KEY, new Date(Date.now() + 5000).toISOString());
		const auth = useAuthStore();
		auth.restoreSession('');

		await vi.advanceTimersByTimeAsync(5001);

		expect(post).toHaveBeenCalledWith('/user/logout', undefined, expect.objectContaining({ notify: 'snackbar' }));
		expect(localStorage.getItem(TOKEN_EXPIRATION_KEY)).toBeNull();
		expect(push).toHaveBeenCalledWith('/login');
	});

	it('keeps the session when the logout request fails', async () => {
		post.mockRejectedValueOnce(new Error('offline'));
		localStorage.setItem(TOKEN_EXPIRATION_KEY, inAnHour());
		const auth = useAuthStore();

		await expect(auth.logOut()).rejects.toThrow('offline');
		expect(localStorage.getItem(TOKEN_EXPIRATION_KEY)).not.toBeNull();
	});
});
