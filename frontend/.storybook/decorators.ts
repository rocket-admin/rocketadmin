import type { RouteRecordRaw } from 'vue-router';

/**
 * Storybook parameters this project understands, set per story/meta and consumed by the global
 * `setup()` hook in `./preview.ts`. Plugins have to be installed on the app *before* it mounts,
 * which a decorator can't do — but `setup()` receives the story context, so the story declares
 * what it needs as data here and preview.ts does the installing.
 */

/** Which route is current + any extra paths to register. See `preview.ts`. */
export interface RouterParams {
	/** Route the story starts on, so active-link styling can be exercised. Defaults to '/'. */
	initialPath?: string;
	/** Route paths to register beyond the app's top-level ones. */
	extraPaths?: string[];
}

/** Session state seeded before the component mounts. */
export interface AuthParams {
	/** ISO timestamp the session expires at; `null` signs out. */
	expiresAt?: string | null;
}

/** A date far enough out that stories don't start failing once it passes. */
export const FUTURE_EXPIRY = '2999-01-01T00:00:00.000Z';

export const signedIn: AuthParams = { expiresAt: FUTURE_EXPIRY };
export const signedOut: AuthParams = { expiresAt: null };

/**
 * Route table for a story's router. Stubbed to blank components — a story only needs its `to`
 * targets to resolve so `router-link-active` classes apply; it never navigates to the real views.
 * The real `src/router` can't be reused because its guards redirect signed-out visitors to /login.
 */
export function buildRoutes(params: RouterParams = {}): RouteRecordRaw[] {
	const blank = { template: '<div />' };
	const paths = new Set([
		'/',
		'/connections-list',
		'/user-settings',
		'/company',
		'/secrets',
		'/zapier',
		'/login',
		params.initialPath ?? '/',
		...(params.extraPaths ?? []),
	]);
	return [...paths].map((path) => ({ path, component: blank }));
}
