// Every route of frontend/src/app/app-routing.module.ts, with the same paths, so bookmarks and
// emailed links keep working. Pages not ported yet (Phase 3) render PendingView.
import type { RouteRecordRaw } from 'vue-router';

const PendingView = () => import('@/views/PendingView.vue');

const page = (path: string, name: string, meta: RouteRecordRaw['meta'] = {}): RouteRecordRaw => ({
	path,
	name,
	component: PendingView,
	meta,
});

const auth = { requiresAuth: true };

export const routes: RouteRecordRaw[] = [
	{ path: '/', redirect: '/connections-list' },
	page('/setup', 'setup', { setup: true, title: 'Setup | Rocketadmin' }),
	page('/login', 'login', { guestOnly: true, configuration: true, title: 'Login | Rocketadmin' }),
	page('/forget-password', 'forget-password', { title: 'Request password | Rocketadmin' }),
	page('/external/user/password/reset/verify/:verificationToken', 'password-reset', {
		title: 'Reset password | Rocketadmin',
	}),
	page('/external/user/email/verify/:verificationToken', 'email-verification', {
		title: 'Email verification | Rocketadmin',
	}),
	page('/external/user/email/change/verify/:changeToken', 'email-change', { title: 'Email updating | Rocketadmin' }),
	page('/deleted', 'user-deleted', { title: 'User deleted | Rocketadmin' }),
	page('/connect-db', 'connect-db', auth),
	page('/connections-list', 'connections-list', auth),
	page('/user-settings', 'user-settings', auth),
	page('/company/:companyId/verify/:verificationToken', 'company-invitation', { title: 'Invitation | Rocketadmin' }),
	page('/company', 'company', auth),
	page('/api-keys', 'api-keys', { ...auth, title: 'API Keys | Rocketadmin' }),
	page('/secrets', 'secrets', { ...auth, title: 'Secrets | Rocketadmin' }),
	page('/change-password', 'change-password', auth),
	{ path: '/hosted-databases', redirect: '/connections-list' },
	{ path: '/saml', redirect: '/connections-list' },
	{ path: '/demo', redirect: '/connections-list' },
	{ path: '/upgrade', redirect: '/connections-list' },
	{ path: '/upgrade/payment', redirect: '/connections-list' },
	{ path: '/subscription/success', redirect: '/connections-list' },
	page('/auto-configure/:connectionId', 'auto-configure', { ...auth, title: 'Auto-configure | Rocketadmin' }),
	page('/edit-db/:connectionId', 'edit-db', auth),
	page('/edit-database-schema/:connectionId', 'edit-database-schema', {
		...auth,
		title: 'Edit Database Schema | Rocketadmin',
	}),
	page('/connection-settings/:connectionId', 'connection-settings', auth),
	page('/dashboard/:connectionId', 'dashboard', auth),
	page('/audit/:connectionId', 'audit', auth),
	page('/dashboard/:connectionId/:tableName', 'table', auth),
	page('/dashboard/:connectionId/:tableName/entry', 'row-edit', auth),
	page('/dashboard/:connectionId/:tableName/widgets', 'table-widgets', auth),
	page('/dashboard/:connectionId/:tableName/settings', 'table-settings', auth),
	page('/dashboard/:connectionId/:tableName/actions', 'table-actions', auth),
	page('/permissions/:connectionId', 'permissions', auth),
	page('/zapier', 'zapier', auth),
	page('/panels/:connectionId', 'panels', { ...auth, title: 'Saved Queries | Rocketadmin' }),
	page('/panels/:connectionId/new', 'panel-new', { ...auth, title: 'Create Query | Rocketadmin' }),
	page('/panels/:connectionId/:queryId', 'panel-edit', { ...auth, title: 'Edit Query | Rocketadmin' }),
	page('/dashboards/:connectionId', 'dashboards', { ...auth, title: 'Dashboards | Rocketadmin' }),
	page('/dashboards/:connectionId/:dashboardId', 'dashboard-view', { ...auth, title: 'Dashboard | Rocketadmin' }),
	{
		path: '/:pathMatch(.*)*',
		name: 'not-found',
		component: () => import('@/views/NotFoundView.vue'),
	},
];
