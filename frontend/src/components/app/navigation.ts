// The connection tabs (AppComponent.navigationTabs) and the account links, shared by the header and
// the mobile drawer.
import type { ConnectionTab } from '@/stores/connections';

export const CONNECTION_TAB_CAPTIONS: Record<ConnectionTab, string> = {
	dashboard: 'Tables',
	audit: 'Audit',
	permissions: 'Permissions',
	dashboards: 'Dashboards',
	'connection-settings': 'Connection settings',
	'edit-db': 'Edit connection',
};

export function connectionTabPath(tab: ConnectionTab, connectionId: string): string {
	return `/${tab}/${connectionId}`;
}

export interface AccountLink {
	to: string;
	icon: string;
	label: string;
	testId: string;
	saasOnly?: boolean;
}

export const ACCOUNT_LINKS: AccountLink[] = [
	{ to: '/company', icon: 'apartment', label: 'Company', testId: 'company-link-account-menu' },
	{ to: '/secrets', icon: 'key', label: 'Secrets', testId: 'secrets-link-account-menu' },
	{ to: '/zapier', icon: 'electric_bolt', label: 'Zapier', testId: 'zapier-link-account-menu', saasOnly: true },
];

export const HELP_CENTER_URL = 'https://docs.rocketadmin.com/';
