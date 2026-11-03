// Ports the behaviour covered by frontend/src/app/services/connections.service.spec.ts.
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, nextTick } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { fakeError, jsonResponse, mockFetch } from '@/__tests__/mock-fetch';
import { buildHeaders } from '@/api/client';
import { AlertActionType, AlertType } from '@/models/alert';
import { type Connection, ConnectionType, DBtype } from '@/models/connection';
import { AccessLevel } from '@/models/user';
import { useNotificationsStore } from '@/stores/notifications';
import {
	bindConnectionsToRouter,
	CONNECTION_INITIAL_STATE,
	defineConnectionTitle,
	defineConnectionType,
	useConnectionsStore,
} from './connections';

vi.mock('@/environment', () => ({ environment: { apiRoot: '', saasURL: '' } }));
vi.mock('@/config', () => ({ getConfig: () => ({ baseURL: '/api', saasURL: '' }) }));

const permissions = vi.hoisted(() => ({
	canI: vi.fn<(action: string, resourceType: string, resourceId: string | null) => boolean | null>(() => false),
	canIAny: vi.fn<(action: string, resourceType: string) => boolean | null>(() => false),
}));
const masterPassword = vi.hoisted(() => ({ showMasterPasswordDialog: vi.fn(), checkMasterPassword: vi.fn() }));
const users = vi.hoisted(() => ({ setActiveConnection: vi.fn() }));

// The mocked permission checks are re-read on every evaluation, so a test can change the answer.
vi.mock('@/stores/cedar-permissions', () => ({
	useCedarPermissionsStore: () => ({
		canI: (action: string, resourceType: string, resourceId: string | null) =>
			computed(() => permissions.canI(action, resourceType, resourceId)),
		canIAny: (action: string, resourceType: string) => computed(() => permissions.canIAny(action, resourceType)),
	}),
}));
vi.mock('@/stores/master-password', () => ({ useMasterPasswordStore: () => masterPassword }));
vi.mock('@/stores/users', () => ({ useUsersStore: () => users }));

const connectionCredsApp: Connection = {
	id: '9d5f6d0f-9516-4598-91c4-e4fe6330b4d4',
	title: 'Test connection via SSH tunnel to mySQL',
	masterEncryption: false,
	type: DBtype.MySQL,
	host: 'database-2.example.com',
	port: '3306',
	username: 'admin',
	database: 'testDB',
	schema: undefined,
	sid: null,
	ssh: true,
	sshHost: '3.134.99.192',
	sshPort: '22',
	sshUsername: 'ubuntu',
	ssl: false,
	cert: '',
	azure_encryption: false,
	connectionType: ConnectionType.Direct,
	signing_key: 'signing-key',
};

function connectionResponse(overrides: Record<string, unknown> = {}) {
	return {
		connection: { ...connectionCredsApp, connectionType: undefined },
		accessLevel: AccessLevel.Edit,
		groupManagement: true,
		...overrides,
	};
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('connections store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		localStorage.clear();
		vi.clearAllMocks();
		permissions.canI.mockReturnValue(false);
		permissions.canIAny.mockReturnValue(false);
		document.documentElement.removeAttribute('style');
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('helpers', () => {
		it('marks plain connections as direct', () => {
			expect(defineConnectionType({ type: 'mysql', title: 'x' })).toEqual({
				type: 'mysql',
				title: 'x',
				connectionType: ConnectionType.Direct,
			});
		});

		it('strips the agent_ prefix and marks the connection as agent', () => {
			expect(defineConnectionType({ type: 'agent_mysql', title: 'x' })).toEqual({
				type: 'mysql',
				title: 'x',
				connectionType: ConnectionType.Agent,
			});
		});

		it('names untitled connections', () => {
			expect(defineConnectionTitle({ title: '', database: '', masterEncryption: true })).toBe(
				'Untitled encrypted connection',
			);
			expect(defineConnectionTitle({ title: '', database: '', masterEncryption: false })).toBe('Untitled connection');
			expect(defineConnectionTitle({ title: '', database: 'db', masterEncryption: false })).toBe('db');
			expect(defineConnectionTitle({ title: 'Mine', database: 'db', masterEncryption: false })).toBe('Mine');
		});
	});

	describe('current connection', () => {
		it('sets the connection info, title and signing key from /connection/one', async () => {
			const fetch = mockFetch(jsonResponse(connectionResponse()));
			const store = useConnectionsStore();
			store.setConnectionID('12345678');

			await store.setConnectionInfo('12345678');

			expect(fetch.last().url).toBe('/api/connection/one/12345678');
			expect(store.currentConnection).toEqual(connectionCredsApp);
			expect(store.connectionAccessLevel).toBe('edit');
			expect(store.groupsAccessLevel).toBe(true);
			expect(store.connectionTitle).toBe(connectionCredsApp.title);
			expect(store.connectionSigningKey).toBe('signing-key');
			expect(store.currentConnectionName).toBe(connectionCredsApp.title);
		});

		it('resets to the initial state without a connection id', async () => {
			const store = useConnectionsStore();
			store.connection = { ...connectionCredsApp };
			await store.setConnectionInfo(null);
			expect(store.connection).toEqual(CONNECTION_INITIAL_STATE);
			expect(store.isCustomAccentedColor).toBe(false);
		});

		it('applies the custom accent colour and default table from the connection properties', async () => {
			mockFetch(
				jsonResponse(
					connectionResponse({
						connectionProperties: { secondary_color: '#654321', default_showing_table: 'users' },
					}),
				),
			);
			const store = useConnectionsStore();
			store.setConnectionID('12345678');
			await store.setConnectionInfo('12345678');

			expect(store.isCustomAccentedColor).toBe(true);
			expect(store.defaultDisplayTable).toBe('users');
			expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe('#654321');
		});

		it('removes the accent override when the connection has no custom colour', async () => {
			document.documentElement.style.setProperty('--color-accent', '#654321');
			mockFetch(jsonResponse(connectionResponse({ connectionProperties: { secondary_color: null } })));
			const store = useConnectionsStore();
			await store.setConnectionInfo('12345678');

			expect(store.isCustomAccentedColor).toBe(false);
			expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe('');
		});

		it('ignores a response for a connection the user has already left', async () => {
			mockFetch(jsonResponse(connectionResponse()));
			const store = useConnectionsStore();
			store.setConnectionID('first');
			const pending = store.setConnectionInfo('first');
			store.setConnectionID('second');
			await pending;
			expect(store.connection.id).toBeNull();
		});

		it('registers the current connection id for the masterpwd header', () => {
			const store = useConnectionsStore();
			store.setConnectionID('12345678');
			localStorage.setItem('12345678__masterKey', 'secret');
			expect(buildHeaders('/api/connections').get('masterpwd')).toBe('secret');
		});
	});

	describe('visibleTabs', () => {
		it('shows dashboard and audit when every permission is denied', () => {
			expect(useConnectionsStore().visibleTabs).toEqual(['dashboard', 'audit']);
		});

		it('shows dashboards when dashboard:read is allowed', () => {
			permissions.canIAny.mockImplementation((action) => action === 'dashboard:read');
			const tabs = useConnectionsStore().visibleTabs;
			expect(tabs).toContain('dashboards');
			expect(tabs).not.toContain('permissions');
		});

		it('shows permissions when group:read is allowed', () => {
			permissions.canIAny.mockImplementation((action) => action === 'group:read');
			const tabs = useConnectionsStore().visibleTabs;
			expect(tabs).toContain('permissions');
			expect(tabs).not.toContain('dashboards');
		});

		it('shows every tab when everything is allowed, checking connection:edit on the current connection', () => {
			permissions.canI.mockReturnValue(true);
			permissions.canIAny.mockReturnValue(true);
			const store = useConnectionsStore();
			store.setConnectionID('12345678');
			expect(store.visibleTabs).toEqual([
				'dashboard',
				'audit',
				'dashboards',
				'permissions',
				'connection-settings',
				'edit-db',
			]);
			expect(permissions.canI).toHaveBeenCalledWith('connection:edit', 'Connection', '12345678');
		});
	});

	describe('fetchConnections', () => {
		it('normalizes the list and keeps own (non-test) connections', async () => {
			mockFetch(
				jsonResponse({
					connections: [
						{ connection: { id: 'a', title: 'Test', type: 'oracledb', isTestConnection: true }, accessLevel: 'edit' },
						{ connection: { id: 'b', title: '', database: 'db', type: 'agent_mysql' }, accessLevel: 'readonly' },
					],
					connectionsCount: 2,
				}),
			);
			const store = useConnectionsStore();
			const list = await store.fetchConnections();

			expect(list).toHaveLength(2);
			expect(list[1]).toMatchObject({
				displayTitle: 'db',
				connection: { type: 'mysql', connectionType: ConnectionType.Agent },
			});
			expect(store.ownConnectionsList?.map((item) => item.connection.id)).toEqual(['b']);
		});

		it('shows an error alert with a Dismiss action on failure', async () => {
			mockFetch(jsonResponse(fakeError, 400));
			const store = useConnectionsStore();
			const notifications = useNotificationsStore();
			const showAlert = vi.spyOn(notifications, 'showAlert');

			await expect(store.fetchConnections()).rejects.toThrow();
			expect(showAlert).toHaveBeenCalledWith(
				AlertType.Error,
				{ abstract: fakeError.message, details: fakeError.originalMessage },
				[expect.objectContaining({ type: AlertActionType.Button, caption: 'Dismiss' })],
			);
		});

		it('records the first visit for the repeat-visit conversion', async () => {
			mockFetch(jsonResponse({ connections: [] }));
			await useConnectionsStore().fetchConnections();
			expect(localStorage.getItem('first_visit_time')).not.toBeNull();
		});
	});

	describe('fetchConnection', () => {
		it('shows an error snackbar on failure', async () => {
			mockFetch(jsonResponse(fakeError, 400));
			const store = useConnectionsStore();
			const showErrorSnackbar = vi.spyOn(useNotificationsStore(), 'showErrorSnackbar');

			await expect(store.fetchConnection('12345678')).rejects.toThrow();
			expect(showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
			expect(masterPassword.showMasterPasswordDialog).not.toHaveBeenCalled();
		});

		it('asks for the master password when the server needs it', async () => {
			mockFetch(jsonResponse({ ...fakeError, type: 'no_master_key' }, 400));
			await expect(useConnectionsStore().fetchConnection('12345678')).rejects.toThrow();
			expect(masterPassword.showMasterPasswordDialog).toHaveBeenCalled();
		});
	});

	describe('connection CRUD', () => {
		it('testConnection posts numeric ports and the connection id', async () => {
			const fetch = mockFetch(jsonResponse({ result: true }));
			const res = await useConnectionsStore().testConnection('12345678', connectionCredsApp);

			expect(res).toEqual({ result: true });
			expect(fetch.last().url).toBe('/api/connection/test?connectionId=12345678');
			expect(fetch.last().json).toMatchObject({ port: 3306, sshPort: 22, type: 'mysql' });
		});

		it('testConnection prefixes agent connections and shows failures as an alert', async () => {
			const fetch = mockFetch(jsonResponse(fakeError, 400));
			const showAlert = vi.spyOn(useNotificationsStore(), 'showAlert');
			await expect(
				useConnectionsStore().testConnection(null, { ...connectionCredsApp, connectionType: ConnectionType.Agent }),
			).rejects.toThrow();

			expect(fetch.last().url).toBe('/api/connection/test');
			expect(fetch.last().json).toMatchObject({ type: 'agent_mysql' });
			expect(showAlert).toHaveBeenCalledWith(
				AlertType.Error,
				{ abstract: fakeError.message, details: fakeError.originalMessage },
				expect.any(Array),
			);
		});

		it('createConnection sends the master key, checks it, invalidates the list and confirms', async () => {
			const fetch = mockFetch(jsonResponse({ id: 'new-id' }));
			const store = useConnectionsStore();
			const showSuccessSnackbar = vi.spyOn(useNotificationsStore(), 'showSuccessSnackbar');
			const version = store.connectionsVersion;

			const res = await store.createConnection({ ...connectionCredsApp, masterEncryption: true }, 'key');

			expect(res).toEqual({ id: 'new-id' });
			expect(fetch.last().method).toBe('POST');
			expect(fetch.last().headers.get('masterpwd')).toBe('key');
			expect(masterPassword.checkMasterPassword).toHaveBeenCalledWith(true, 'new-id', 'key');
			expect(store.connectionsVersion).toBe(version + 1);
			expect(showSuccessSnackbar).toHaveBeenCalledWith('Connection was added successfully.');
		});

		it('createConnection shows an error alert and rethrows', async () => {
			mockFetch(jsonResponse(fakeError, 400));
			const showAlert = vi.spyOn(useNotificationsStore(), 'showAlert');
			await expect(useConnectionsStore().createConnection(connectionCredsApp, '')).rejects.toThrow(fakeError.message);
			expect(showAlert).toHaveBeenCalled();
		});

		it('updateConnection puts to the connection and confirms', async () => {
			const fetch = mockFetch(jsonResponse({ connection: {} }));
			const store = useConnectionsStore();
			const showSuccessSnackbar = vi.spyOn(useNotificationsStore(), 'showSuccessSnackbar');

			await store.updateConnection(connectionCredsApp, '');

			expect(fetch.last().method).toBe('PUT');
			expect(fetch.last().url).toBe(`/api/connection/${connectionCredsApp.id}`);
			expect(fetch.last().headers.has('masterpwd')).toBe(false);
			expect(showSuccessSnackbar).toHaveBeenCalledWith('Connection has been updated successfully.');
			expect(store.connectionsVersion).toBe(1);
		});

		it('updateConnection shows an error alert with Dismiss and rethrows', async () => {
			mockFetch(jsonResponse(fakeError, 400));
			const showAlert = vi.spyOn(useNotificationsStore(), 'showAlert');
			await expect(useConnectionsStore().updateConnection(connectionCredsApp, '')).rejects.toThrow();
			expect(showAlert).toHaveBeenCalledWith(
				AlertType.Error,
				{ abstract: fakeError.message, details: fakeError.originalMessage },
				[expect.objectContaining({ caption: 'Dismiss' })],
			);
		});

		it('deleteConnection puts the metadata, invalidates the list and confirms', async () => {
			const fetch = mockFetch(jsonResponse({}));
			const store = useConnectionsStore();
			const showSuccessSnackbar = vi.spyOn(useNotificationsStore(), 'showSuccessSnackbar');

			await store.deleteConnection('12345678', { reason: 'missing-features', message: 'x' });

			expect(fetch.last().url).toBe('/api/connection/delete/12345678');
			expect(fetch.last().json).toEqual({ reason: 'missing-features', message: 'x' });
			expect(store.connectionsVersion).toBe(1);
			expect(showSuccessSnackbar).toHaveBeenCalledWith('Connection has been deleted successfully.');
		});

		it('deleteConnection shows an error snackbar on failure', async () => {
			mockFetch(jsonResponse(fakeError, 400));
			const showErrorSnackbar = vi.spyOn(useNotificationsStore(), 'showErrorSnackbar');
			await expect(useConnectionsStore().deleteConnection('12345678', {})).rejects.toThrow();
			expect(showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
		});
	});

	describe('fetchAuditLog', () => {
		it('requests the page with table and email filters', async () => {
			const fetch = mockFetch(jsonResponse({ logs: [] }));
			await useConnectionsStore().fetchAuditLog({
				connectionID: '12345678',
				tableName: 'users_table',
				userEmail: 'eric.cartman@south.park',
				requstedPage: 2,
				chunkSize: 10,
			});
			expect(fetch.last().url).toBe(
				'/api/logs/12345678?page=2&perPage=10&tableName=users_table&email=eric.cartman%40south.park',
			);
		});

		it('drops the filters set to showAll', async () => {
			const fetch = mockFetch(jsonResponse({ logs: [] }));
			await useConnectionsStore().fetchAuditLog({
				connectionID: '12345678',
				tableName: 'showAll',
				userEmail: 'showAll',
				requstedPage: 1,
				chunkSize: 30,
			});
			expect(fetch.last().url).toBe('/api/logs/12345678?page=1&perPage=30');
		});

		it('shows an error snackbar on failure', async () => {
			mockFetch(jsonResponse(fakeError, 400));
			const showErrorSnackbar = vi.spyOn(useNotificationsStore(), 'showErrorSnackbar');
			await expect(
				useConnectionsStore().fetchAuditLog({ connectionID: '1', requstedPage: 1, chunkSize: 10 }),
			).rejects.toThrow();
			expect(showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
		});
	});

	describe('connection settings', () => {
		const settings = {
			id: 'dd58c614',
			connectionId: '12345678',
			primary_color: '#123456',
			secondary_color: '#654321',
			hidden_tables: ['users', 'orders'],
			tables_audit: true,
		};

		it('getConnectionSettings returns the settings and applies the accent colour', async () => {
			const fetch = mockFetch(jsonResponse(settings));
			const store = useConnectionsStore();
			expect(await store.getConnectionSettings('12345678')).toEqual(settings);
			expect(fetch.last().url).toBe('/api/connection/properties/12345678');
			expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe('#654321');
			expect(store.isCustomAccentedColor).toBe(true);
		});

		it('getConnectionSettings leaves the theme alone when there are no settings', async () => {
			mockFetch(jsonResponse(null));
			document.documentElement.style.setProperty('--color-accent', '#654321');
			expect(await useConnectionsStore().getConnectionSettings('12345678')).toBeNull();
			expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe('#654321');
		});

		it.each([
			['createConnectionSettings', 'POST', 'Connection settings has been created successfully.'],
			['updateConnectionSettings', 'PUT', 'Connection settings has been updated successfully.'],
		] as const)('%s sends the settings and confirms', async (method, httpMethod, message) => {
			const fetch = mockFetch(jsonResponse(settings));
			const showSuccessSnackbar = vi.spyOn(useNotificationsStore(), 'showSuccessSnackbar');
			await useConnectionsStore()[method]('12345678', { hidden_tables: ['users'] });
			expect(fetch.last().method).toBe(httpMethod);
			expect(fetch.last().json).toEqual({ hidden_tables: ['users'] });
			expect(showSuccessSnackbar).toHaveBeenCalledWith(message);
		});

		it('deleteConnectionSettings deletes and confirms', async () => {
			const fetch = mockFetch(jsonResponse(null));
			const showSuccessSnackbar = vi.spyOn(useNotificationsStore(), 'showSuccessSnackbar');
			await useConnectionsStore().deleteConnectionSettings('12345678');
			expect(fetch.last().method).toBe('DELETE');
			expect(showSuccessSnackbar).toHaveBeenCalledWith('Connection settings has been removed successfully.');
		});

		it('settings failures show an error snackbar', async () => {
			mockFetch(jsonResponse(fakeError, 400));
			const showErrorSnackbar = vi.spyOn(useNotificationsStore(), 'showErrorSnackbar');
			await expect(useConnectionsStore().updateConnectionTitle('12345678', 'New')).rejects.toThrow();
			expect(showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
		});
	});

	describe('bindConnectionsToRouter', () => {
		let router: Router;

		beforeEach(async () => {
			const view = { template: '<div />' };
			router = createRouter({
				history: createMemoryHistory(),
				routes: [
					{ path: '/connections-list', component: view },
					{ path: '/dashboard/:connectionId', component: view },
					{ path: '/dashboard/:connectionId/:tableName', component: view },
				],
			});
			await router.push('/connections-list');
		});

		it('follows the connection id and page of the route', async () => {
			const fetch = mockFetch(jsonResponse(connectionResponse()));
			const store = useConnectionsStore();
			const resetAlert = vi.spyOn(useNotificationsStore(), 'resetAlert');
			bindConnectionsToRouter(router);
			expect(store.connectionID).toBeNull();
			expect(store.currentTab).toBe('connections-list');

			await router.push('/dashboard/12345678');
			await flush();

			expect(store.connectionID).toBe('12345678');
			expect(store.currentTab).toBe('dashboard');
			expect(users.setActiveConnection).toHaveBeenCalledWith('12345678');
			expect(resetAlert).toHaveBeenCalled();
			expect(fetch.requests.map((request) => request.url)).toEqual(['/api/connection/one/12345678']);
			expect(store.currentConnectionName).toBe(connectionCredsApp.title);
		});

		it('does not refetch the connection when only the query changes', async () => {
			const fetch = mockFetch(jsonResponse(connectionResponse()));
			bindConnectionsToRouter(router);
			await router.push('/dashboard/12345678/users');
			await router.push('/dashboard/12345678/users?page_index=2');
			await flush();
			await nextTick();
			expect(fetch.requests).toHaveLength(1);
		});
	});
});
