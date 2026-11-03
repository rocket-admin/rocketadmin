// Parity checklist for the cutover (VUE_MIGRATION_PLAN.md, Phase 4): every route of
// frontend/src/app/app-routing.module.ts (and its routes/*.routes.ts children) resolves in the
// Vue router with the same path, guard and title, so existing bookmarks and emailed links keep
// working. The Angular table is a snapshot, so this spec outlives the deletion of frontend/.
import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { routes } from './routes';

interface AngularRoute {
	path: string;
	auth?: boolean;
	title?: string;
}

const angularPages: AngularRoute[] = [
	{ path: 'setup', title: 'Setup | Rocketadmin' },
	{ path: 'login', title: 'Login | Rocketadmin' },
	{ path: 'forget-password', title: 'Request password | Rocketadmin' },
	{ path: 'external/user/password/reset/verify/:verification-token', title: 'Reset password | Rocketadmin' },
	{ path: 'external/user/email/verify/:verification-token', title: 'Email verification | Rocketadmin' },
	{ path: 'external/user/email/change/verify/:change-token', title: 'Email updating | Rocketadmin' },
	{ path: 'deleted', title: 'User deleted | Rocketadmin' },
	{ path: 'connect-db', auth: true },
	{ path: 'connections-list', auth: true },
	{ path: 'user-settings', auth: true },
	{ path: 'company/:company-id/verify/:verification-token', title: 'Invitation | Rocketadmin' },
	{ path: 'company', auth: true },
	{ path: 'api-keys', auth: true, title: 'API Keys | Rocketadmin' },
	{ path: 'secrets', auth: true, title: 'Secrets | Rocketadmin' },
	{ path: 'change-password', auth: true },
	{ path: 'auto-configure/:connection-id', auth: true, title: 'Auto-configure | Rocketadmin' },
	{ path: 'edit-db/:connection-id', auth: true },
	{ path: 'edit-database-schema/:connection-id', auth: true, title: 'Edit Database Schema | Rocketadmin' },
	{ path: 'connection-settings/:connection-id', auth: true },
	{ path: 'dashboard/:connection-id', auth: true },
	{ path: 'audit/:connection-id', auth: true },
	{ path: 'dashboard/:connection-id/:table-name', auth: true },
	{ path: 'dashboard/:connection-id/:table-name/entry', auth: true },
	{ path: 'dashboard/:connection-id/:table-name/widgets', auth: true },
	{ path: 'dashboard/:connection-id/:table-name/settings', auth: true },
	{ path: 'dashboard/:connection-id/:table-name/actions', auth: true },
	{ path: 'permissions/:connection-id', auth: true },
	{ path: 'zapier', auth: true },
	{ path: 'panels/:connection-id', auth: true, title: 'Saved Queries | Rocketadmin' },
	{ path: 'panels/:connection-id/new', auth: true, title: 'Create Query | Rocketadmin' },
	{ path: 'panels/:connection-id/:query-id', auth: true, title: 'Edit Query | Rocketadmin' },
	{ path: 'dashboards/:connection-id', auth: true, title: 'Dashboards | Rocketadmin' },
	{ path: 'dashboards/:connection-id/:dashboard-id', auth: true, title: 'Dashboard | Rocketadmin' },
];

const angularRedirects: Record<string, string> = {
	'': '/connections-list',
	'hosted-databases': '/connections-list',
	saml: '/connections-list',
	demo: '/connections-list',
	upgrade: '/connections-list',
	'upgrade/payment': '/connections-list',
	'subscription/success': '/connections-list',
};

// A concrete URL for an Angular path: `:connection-id` becomes `connection-id-value`.
function sampleUrl(path: string): string {
	return `/${path.replace(/:([\w-]+)/g, '$1-value')}`;
}

function resolve(url: string) {
	const router = createRouter({ history: createMemoryHistory(), routes });
	return router.resolve(url);
}

describe('route parity with the Angular app', () => {
	it.each(angularPages)('/$path resolves to a page with the same guard and title', ({ path, auth, title }) => {
		const url = sampleUrl(path);
		const route = resolve(url);

		expect(route.name).not.toBe('not-found');
		expect(route.path).toBe(url);
		expect(Boolean(route.meta.requiresAuth)).toBe(Boolean(auth));
		expect(route.meta.title).toBe(title);
	});

	it.each(Object.entries(angularRedirects))('/%s redirects to %s', (path, target) => {
		const record = routes.find((route) => route.path === `/${path}`);
		expect(record?.redirect).toBe(target);
	});

	it('keeps the whole URL as route params, so ids and table names round-trip', () => {
		const route = resolve('/dashboard/abc123/public.users%20archive/entry?id=7&mode=view');

		expect(route.name).toBe('row-edit');
		expect(route.params).toEqual({ connectionId: 'abc123', tableName: 'public.users archive' });
		expect(route.query).toEqual({ id: '7', mode: 'view' });
	});

	it('matches /panels/:id/new before the :queryId route', () => {
		expect(resolve('/panels/abc/new').name).toBe('panel-new');
		expect(resolve('/panels/abc/42').name).toBe('panel-edit');
	});

	it('sends unknown URLs to the 404 page, like the Angular ** route', () => {
		expect(resolve('/no-such-page').name).toBe('not-found');
		expect(resolve('/company/extra').name).toBe('not-found');
	});

	it('has no Vue-only pages', () => {
		// Param names differ (`:connection-id` vs `:connectionId`) and never reach the URL.
		const shape = (path: string) => path.replace(/^\//, '').replace(/:[\w-]+/g, ':');
		const angularShapes = angularPages.map(({ path }) => shape(path));
		const vuePages = routes.filter((route) => !route.redirect && route.name !== 'not-found');

		expect(vuePages.map(({ path }) => shape(path)).sort()).toEqual(angularShapes.sort());
	});
});
