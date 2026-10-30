// Ports of the Angular guards, driven by route meta instead of `canActivate` arrays:
//   meta.requiresAuth  → AuthGuard        meta.guestOnly → noAuthGuard
//   meta.configuration → configurationGuard   meta.setup → setupGuard
import type { NavigationGuardWithThis, RouteLocationNormalized, RouteLocationRaw } from 'vue-router';
import { hasValidSessionToken } from '@/stores/auth';
import { useSelfhostedStore } from '@/stores/selfhosted';

declare module 'vue-router' {
	interface RouteMeta {
		/** Signed-in users only; everyone else goes to /login. */
		requiresAuth?: boolean;
		/** Signed-out users only (login); a valid session goes to /connections-list. */
		guestOnly?: boolean;
		/** Self-hosted: /login waits until the first admin exists, otherwise /setup. */
		configuration?: boolean;
		/** /setup itself: self-hosted and not configured yet, otherwise /login. */
		setup?: boolean;
		/** Document title, set after navigation. Routes without one leave the title alone. */
		title?: string;
		/** Leave out the version footer, for pages with their own bottom-pinned panel. */
		hideFooter?: boolean;
	}
}

type GuardResult = true | RouteLocationRaw;

export function authGuard(): GuardResult {
	return hasValidSessionToken() ? true : '/login';
}

export function guestOnlyGuard(): GuardResult {
	try {
		if (hasValidSessionToken()) return '/connections-list';
	} catch {
		// If anything fails, allow access to auth pages.
	}
	return true;
}

export async function configurationGuard(): Promise<GuardResult> {
	const selfhosted = useSelfhostedStore();
	if (!selfhosted.isSelfHosted) return true;
	return (await selfhosted.resolveIsConfigured()) ? true : '/setup';
}

export async function setupGuard(): Promise<GuardResult> {
	const selfhosted = useSelfhostedStore();
	if (!selfhosted.isSelfHosted) return '/login';
	return (await selfhosted.resolveIsConfigured()) ? '/login' : true;
}

/** Runs the guards a route asks for, in the order Angular listed them; the first redirect wins. */
export async function runRouteGuards(to: RouteLocationNormalized): Promise<GuardResult> {
	const checks: Array<() => GuardResult | Promise<GuardResult>> = [];
	if (to.meta.setup) checks.push(setupGuard);
	if (to.meta.guestOnly) checks.push(guestOnlyGuard);
	if (to.meta.configuration) checks.push(configurationGuard);
	if (to.meta.requiresAuth) checks.push(authGuard);

	for (const check of checks) {
		const result = await check();
		if (result !== true) return result;
	}
	return true;
}

export const beforeEachGuard: NavigationGuardWithThis<undefined> = (to) => runRouteGuards(to);

export function applyTitle(to: RouteLocationNormalized): void {
	if (to.meta.title) document.title = to.meta.title;
}
