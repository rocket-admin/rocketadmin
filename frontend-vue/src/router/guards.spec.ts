import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouteLocationNormalized } from 'vue-router';
import { api } from '@/api/client';
import { environment } from '@/environment';
import { useSelfhostedStore } from '@/stores/selfhosted';
import { applyTitle, runRouteGuards } from './guards';
import { routes } from './routes';

vi.mock('@/api/client', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/environment', () => ({ environment: { saas: false } }));

const get = vi.mocked(api.get);

function routeTo(path: string): RouteLocationNormalized {
	const record = routes.find((route) => route.path === path);
	if (!record) throw new Error(`no route ${path}`);
	return { path, meta: record.meta ?? {} } as RouteLocationNormalized;
}

function signIn() {
	localStorage.setItem('token_expiration', new Date(Date.now() + 3_600_000).toISOString());
}

describe('route guards', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		localStorage.clear();
		vi.clearAllMocks();
		environment.saas = false;
	});

	it('sends signed-out users from protected pages to /login', async () => {
		expect(await runRouteGuards(routeTo('/connections-list'))).toBe('/login');
		signIn();
		expect(await runRouteGuards(routeTo('/connections-list'))).toBe(true);
	});

	it('sends signed-in users away from /login', async () => {
		signIn();
		expect(await runRouteGuards(routeTo('/login'))).toBe('/connections-list');
	});

	it('leaves public pages open', async () => {
		expect(await runRouteGuards(routeTo('/forget-password'))).toBe(true);
	});

	describe('self-hosted', () => {
		it('sends /login to /setup until the first admin exists', async () => {
			get.mockResolvedValueOnce({ isConfigured: false });
			expect(await runRouteGuards(routeTo('/login'))).toBe('/setup');
			expect(await runRouteGuards(routeTo('/setup'))).toBe(true);
			expect(get).toHaveBeenCalledTimes(1);
		});

		it('sends /setup to /login once configured', async () => {
			get.mockResolvedValueOnce({ isConfigured: true });
			expect(await runRouteGuards(routeTo('/setup'))).toBe('/login');
			expect(await runRouteGuards(routeTo('/login'))).toBe(true);
		});

		it('assumes configured when the check fails, so login is never blocked', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			get.mockRejectedValueOnce(new Error('down'));
			expect(await runRouteGuards(routeTo('/login'))).toBe(true);
			expect(useSelfhostedStore().isConfigured).toBe(true);
		});
	});

	describe('SaaS', () => {
		it('never shows /setup and never checks the configuration', async () => {
			environment.saas = true;
			expect(await runRouteGuards(routeTo('/setup'))).toBe('/login');
			expect(await runRouteGuards(routeTo('/login'))).toBe(true);
			expect(get).not.toHaveBeenCalled();
		});
	});

	it('sets the document title only for routes that have one', () => {
		document.title = 'Before';
		applyTitle(routeTo('/connections-list'));
		expect(document.title).toBe('Before');
		applyTitle(routeTo('/secrets'));
		expect(document.title).toBe('Secrets | Rocketadmin');
	});
});
