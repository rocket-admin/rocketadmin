// Every route of frontend/src/app/app-routing.module.ts, with the same paths, so bookmarks and
// emailed links keep working.
import type { RouteComponent, RouteRecordRaw } from 'vue-router';

type LazyView = () => Promise<RouteComponent | { default: RouteComponent }>;

// `dashboard` redirects to `table`; one loader for both keeps the page mounted across that redirect.
const DashboardView = () => import('@/views/dashboard/DashboardView.vue');

// Page components by route name.
const views: Record<string, LazyView> = {
	setup: () => import('@/views/auth/SetupView.vue'),
	login: () => import('@/views/auth/LoginView.vue'),
	'forget-password': () => import('@/views/auth/ForgetPasswordView.vue'),
	'password-reset': () => import('@/views/auth/PasswordResetView.vue'),
	'email-verification': () => import('@/views/auth/EmailVerificationView.vue'),
	'email-change': () => import('@/views/auth/EmailChangeView.vue'),
	'user-deleted': () => import('@/views/auth/UserDeletedView.vue'),
	'company-invitation': () => import('@/views/auth/CompanyInvitationView.vue'),
	'change-password': () => import('@/views/auth/PasswordChangeView.vue'),
	'connections-list': () => import('@/views/connections/ConnectionsListView.vue'),
	'connect-db': () => import('@/views/connections/ConnectDbView.vue'),
	'edit-db': () => import('@/views/connections/ConnectDbView.vue'),
	'connection-settings': () => import('@/views/connections/ConnectionSettingsView.vue'),
	'auto-configure': () => import('@/views/connections/AutoConfigureView.vue'),
	dashboard: DashboardView,
	table: DashboardView,
	permissions: () => import('@/views/users/PermissionsView.vue'),
	company: () => import('@/views/settings/CompanyView.vue'),
	'user-settings': () => import('@/views/settings/UserSettingsView.vue'),
	'api-keys': () => import('@/views/settings/ApiKeysView.vue'),
	secrets: () => import('@/views/settings/SecretsView.vue'),
	zapier: () => import('@/views/settings/ZapierView.vue'),
	audit: () => import('@/views/audit/AuditView.vue'),
	panels: () => import('@/views/charts/ChartsListView.vue'),
	'panel-new': () => import('@/views/charts/ChartEditView.vue'),
	'panel-edit': () => import('@/views/charts/ChartEditView.vue'),
	dashboards: () => import('@/views/dashboards/DashboardsListView.vue'),
	'dashboard-view': () => import('@/views/dashboards/DashboardView.vue'),
	'row-edit': () => import('@/views/table/RowEditView.vue'),
	'table-actions': () => import('@/views/table/TableActionsView.vue'),
	'table-widgets': () => import('@/views/table/TableWidgetsView.vue'),
	'table-settings': () => import('@/views/table/TableSettingsView.vue'),
	'edit-database-schema': () => import('@/views/schema/EditDatabaseSchemaView.vue'),
};

function page(path: string, name: string, meta: RouteRecordRaw['meta'] = {}): RouteRecordRaw {
	const component = views[name];
	if (!component) throw new Error(`No view registered for route "${name}"`);
	return { path, name, component, meta };
}

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
	page('/dashboard/:connectionId/:tableName/entry', 'row-edit', { ...auth, hideFooter: true }),
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
