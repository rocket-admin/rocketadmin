// Port of ConnectionsService: the connections list, the connection the current route points at
// (its title, access levels, default table and custom accent colour), the connection-level tabs the
// user may see, and the connection CRUD / settings / audit-log endpoints.
//
// Angular derived the current connection from Router NavigationEnd events inside the service. Here
// the store exposes `syncFromRoute(route)`, and `bindConnectionsToRouter(router)` wires it to
// `router.afterEach` (call it once from main.ts / the shell).
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router';
import { api, isApiError, setConnectionIdProvider } from '@/api/client';
import { applyConnectionAccent, resetConnectionAccent } from '@/lib/connection-theme';
import {
	type Connection,
	type ConnectionItem,
	type ConnectionSettings,
	ConnectionType,
	DBtype,
} from '@/models/connection';
import type { AccessLevel } from '@/models/user';
import { useCedarPermissionsStore } from '@/stores/cedar-permissions';
import { useMasterPasswordStore } from '@/stores/master-password';
import { useNotificationsStore } from '@/stores/notifications';
import { useUsersStore } from '@/stores/users';

/** `/connection/properties/:id` as stored: the settings plus their own ids. */
export interface ConnectionProperties extends ConnectionSettings {
	id?: string;
	connectionId?: string;
}

/** GET /connection/one/:id */
export interface ConnectionResponse {
	connection: Connection;
	accessLevel: AccessLevel;
	groupManagement: boolean;
	connectionProperties?: ConnectionProperties | null;
}

/** One entry of GET /connections, with the title the list displays. */
export interface ConnectionListItem extends ConnectionItem {
	displayTitle: string;
}

interface ConnectionsResponse {
	connections: ConnectionItem[];
	connectionsCount?: number;
}

export interface CreatedConnection extends Partial<Connection> {
	id: string;
}

export interface AuditLogParams {
	connectionID: string;
	/** 'showAll' means no filter, as in the Angular audit page. */
	tableName?: string | null;
	userEmail?: string | null;
	requstedPage: number;
	chunkSize: number;
}

/** The fields the delete-connection dialog asks for (why the user is leaving). */
export type DeleteConnectionMetadata = Record<string, unknown>;

/** The tabs of the connection page, in display order. */
export type ConnectionTab = 'dashboard' | 'audit' | 'dashboards' | 'permissions' | 'connection-settings' | 'edit-db';

export const CONNECTION_INITIAL_STATE: Readonly<Connection> = Object.freeze({
	id: null,
	type: DBtype.MySQL,
	host: '',
	port: '3306',
	sid: '',
	username: '',
	password: '',
	database: '',
	authSource: '',
	title: '',
	ssh: false,
	privateSSHKey: '',
	sshHost: '',
	sshPort: '',
	sshUsername: '',
	ssl: false,
	cert: '',
	masterEncryption: false,
	azure_encryption: false,
	connectionType: ConnectionType.Direct,
	signing_key: undefined,
});

/** The backend encodes agent connections as `type: 'agent_<db>'`; split that into type + connectionType. */
export function defineConnectionType<T extends { type?: string; connectionType?: ConnectionType }>(
	connection: T,
): T & { connectionType: ConnectionType } {
	if (connection.type?.startsWith('agent_')) {
		return { ...connection, type: connection.type.slice(6), connectionType: ConnectionType.Agent };
	}
	return { ...connection, connectionType: ConnectionType.Direct };
}

export function defineConnectionTitle(connection: Pick<Connection, 'title' | 'database' | 'masterEncryption'>): string {
	if (!connection.title && connection.masterEncryption) return 'Untitled encrypted connection';
	if (!connection.title && !connection.database) return 'Untitled connection';
	return connection.title || connection.database;
}

export function isPermitted(accessLevel: AccessLevel | null | undefined): boolean {
	return accessLevel === 'edit' || accessLevel === 'readonly';
}

export const useConnectionsStore = defineStore('connections', () => {
	const notifications = useNotificationsStore();
	const permissions = useCedarPermissionsStore();

	const connectionID = ref<string | null>(null);
	const connection = ref<Connection>({ ...CONNECTION_INITIAL_STATE });
	const connectionAccessLevel = ref<AccessLevel | null>(null);
	const groupsAccessLevel = ref<boolean | null>(null);
	/** First path segment of the current route ('dashboard', 'audit', ...). */
	const currentPage = ref<string | null>(null);
	const isCustomAccentedColor = ref(false);
	const defaultDisplayTable = ref<string | null>(null);
	/** null until the first fetchConnections(); test connections are excluded. */
	const ownConnections = ref<ConnectionListItem[] | null>(null);
	/** Replaces getCurrentConnectionTitle(): 'Rocketadmin' until a connection has loaded. */
	const connectionTitle = ref('Rocketadmin');
	/** Replaces getCurrentConnectionSigningKey(). */
	const connectionSigningKey = ref<string | null>(null);
	/**
	 * Replaces `cast` / invalidateConnections(): bumped whenever the list is stale (a connection was
	 * created, updated or deleted). The shell watches it (immediately) and calls fetchConnections().
	 */
	const connectionsVersion = ref(0);

	setConnectionIdProvider(() => connectionID.value);

	const currentConnectionName = computed(() => defineConnectionTitle(connection.value));
	const canReadDashboards = permissions.canIAny('dashboard:read', 'Dashboard');
	const canReadGroups = permissions.canIAny('group:read', 'Group');
	const canEditConnection = computed(
		() => !!permissions.canI('connection:edit', 'Connection', connectionID.value).value,
	);

	const visibleTabs = computed<ConnectionTab[]>(() => {
		const tabs: ConnectionTab[] = ['dashboard', 'audit'];
		if (canReadDashboards.value) tabs.push('dashboards');
		if (canReadGroups.value) tabs.push('permissions');
		if (canEditConnection.value) tabs.push('connection-settings', 'edit-db');
		return tabs;
	});

	function invalidateConnections(): void {
		connectionsVersion.value++;
	}

	function setConnectionID(id: string | null): void {
		connectionID.value = id;
	}

	/** Loads (or, with no id, clears) the current connection. Errors are already reported by the request. */
	async function setConnectionInfo(id: string | null): Promise<void> {
		defaultDisplayTable.value = null;
		if (!id) {
			connection.value = { ...CONNECTION_INITIAL_STATE };
			isCustomAccentedColor.value = false;
			resetConnectionAccent();
			return;
		}
		let res: ConnectionResponse;
		try {
			res = await loadConnection(id);
		} catch {
			return;
		}
		// The user may have moved to another connection while this one was loading.
		if (connectionID.value !== null && connectionID.value !== id) return;
		applyConnectionProperties(res.connectionProperties);
		connection.value = res.connection;
		connectionAccessLevel.value = res.accessLevel;
		groupsAccessLevel.value = res.groupManagement;
		connectionTitle.value = res.connection.title || res.connection.database;
		connectionSigningKey.value = res.connection.signing_key ?? null;
	}

	/** What the Angular NavigationEnd subscription did on every navigation. */
	function syncFromRoute(route: RouteLocationNormalizedLoaded, from?: RouteLocationNormalizedLoaded): void {
		const id = routeParam(route, 'connectionId');
		currentPage.value = route.path.split('/')[1] || null;
		const changed = !from || from.path !== route.path || connectionID.value !== id;
		setConnectionID(id);
		// Angular refetched on every NavigationEnd; a query-only change (table paging, filters)
		// can't change the connection, so it no longer triggers a refetch.
		if (changed) setConnectionInfo(id);
		if (id) useUsersStore().setActiveConnection(id);
		notifications.resetAlert();
	}

	async function fetchConnections(): Promise<ConnectionListItem[]> {
		checkAndSendConversion();
		const res = await api.get<ConnectionsResponse>('/connections', { notify: 'alert' });
		const connections = res.connections.map((item) => ({
			...item,
			connection: defineConnectionType(item.connection),
			displayTitle: defineConnectionTitle(item.connection),
		}));
		ownConnections.value = connections.filter((item) => !item.connection.isTestConnection);
		return connections;
	}

	/** GET /connection/one/:id; also applies the connection's default table and accent colour. */
	async function fetchConnection(id: string): Promise<ConnectionResponse> {
		const res = await loadConnection(id);
		applyConnectionProperties(res.connectionProperties);
		return res;
	}

	function testConnection(id: string | null, credentials: Connection): Promise<unknown> {
		return api.post('/connection/test', toDbCredentials(credentials), {
			params: id ? { connectionId: id } : undefined,
			notify: 'alert',
		});
	}

	async function createConnection(credentials: Connection, masterKey: string): Promise<CreatedConnection> {
		const res = await api.post<CreatedConnection>('/connection', toDbCredentials(credentials), {
			headers: masterKey ? { masterpwd: masterKey } : {},
			notify: 'alert',
		});
		invalidateConnections();
		useMasterPasswordStore().checkMasterPassword(credentials.masterEncryption, res.id, masterKey);
		notifications.showSuccessSnackbar('Connection was added successfully.');
		return res;
	}

	async function updateConnection(credentials: Connection, masterKey: string): Promise<unknown> {
		const res = await api.put(`/connection/${credentials.id}`, toDbCredentials(credentials), {
			headers: masterKey ? { masterpwd: masterKey } : {},
			notify: 'alert',
		});
		useMasterPasswordStore().checkMasterPassword(credentials.masterEncryption, credentials.id ?? '', masterKey);
		notifications.showSuccessSnackbar('Connection has been updated successfully.');
		invalidateConnections();
		return res;
	}

	async function deleteConnection(id: string, metadata: DeleteConnectionMetadata): Promise<void> {
		await api.put(`/connection/delete/${id}`, metadata, {
			notify: 'snackbar',
			successMessage: 'Connection has been deleted successfully.',
		});
		invalidateConnections();
	}

	function fetchAuditLog<T = unknown>({
		connectionID: id,
		tableName,
		userEmail,
		requstedPage,
		chunkSize,
	}: AuditLogParams): Promise<T> {
		return api.get<T>(`/logs/${id}`, {
			params: {
				page: requstedPage,
				perPage: chunkSize,
				tableName: tableName && tableName !== 'showAll' ? tableName : undefined,
				email: userEmail && userEmail !== 'showAll' ? userEmail : undefined,
			},
			notify: 'snackbar',
		});
	}

	async function getConnectionSettings(id: string): Promise<ConnectionProperties | null> {
		const res = await api.get<ConnectionProperties | null>(`/connection/properties/${id}`, { notify: 'snackbar' });
		if (res) applyAccent(res.secondary_color);
		return res;
	}

	function createConnectionSettings(id: string, settings: ConnectionSettings): Promise<ConnectionProperties> {
		return api.post<ConnectionProperties>(`/connection/properties/${id}`, settings, {
			notify: 'snackbar',
			successMessage: 'Connection settings has been created successfully.',
		});
	}

	function updateConnectionSettings(id: string, settings: ConnectionSettings): Promise<ConnectionProperties> {
		return api.put<ConnectionProperties>(`/connection/properties/${id}`, settings, {
			notify: 'snackbar',
			successMessage: 'Connection settings has been updated successfully.',
		});
	}

	function updateConnectionTitle(id: string, title: string): Promise<unknown> {
		return api.put(
			`/connection/title/${id}`,
			{ title },
			{ notify: 'snackbar', successMessage: 'Connection title has been updated successfully.' },
		);
	}

	async function deleteConnectionSettings(id: string): Promise<void> {
		await api.delete(`/connection/properties/${id}`, {
			notify: 'snackbar',
			successMessage: 'Connection settings has been removed successfully.',
		});
	}

	return {
		connectionID,
		/** Alias of connectionID, the Angular getter name. */
		currentConnectionID: connectionID,
		connection,
		/** Alias of connection, the Angular getter name. */
		currentConnection: connection,
		connectionAccessLevel,
		groupsAccessLevel,
		currentPage,
		/** Alias of currentPage, the Angular getter name. */
		currentTab: currentPage,
		isCustomAccentedColor,
		defaultDisplayTable,
		ownConnections,
		ownConnectionsList: ownConnections,
		connectionTitle,
		connectionSigningKey,
		connectionsVersion,
		currentConnectionName,
		canEditConnection,
		visibleTabs,
		invalidateConnections,
		setConnectionID,
		setConnectionInfo,
		syncFromRoute,
		fetchConnections,
		fetchConnection,
		testConnection,
		createConnection,
		updateConnection,
		deleteConnection,
		fetchAuditLog,
		getConnectionSettings,
		createConnectionSettings,
		updateConnectionSettings,
		updateConnectionTitle,
		deleteConnectionSettings,
		isPermitted,
		defineConnectionType,
		defineConnectionTitle,
	};

	async function loadConnection(id: string): Promise<ConnectionResponse> {
		let res: ConnectionResponse;
		try {
			res = await api.get<ConnectionResponse>(`/connection/one/${id}`, { notify: 'snackbar' });
		} catch (error) {
			if (isApiError(error) && error.body.type === 'no_master_key' && location.pathname !== '/connections-list') {
				useMasterPasswordStore().showMasterPasswordDialog(id);
			}
			throw error;
		}
		return { ...res, connection: defineConnectionType(res.connection) };
	}

	function applyConnectionProperties(properties: ConnectionProperties | null | undefined): void {
		defaultDisplayTable.value = properties?.default_showing_table ?? null;
		applyAccent(properties?.secondary_color);
	}

	function applyAccent(color: string | null | undefined): void {
		isCustomAccentedColor.value = applyConnectionAccent(color);
	}
});

/**
 * Keeps the connections store in step with the router: call once at startup, after the router and
 * Pinia are installed. Returns the function that removes the hook.
 */
export function bindConnectionsToRouter(router: Router): () => void {
	const store = useConnectionsStore();
	store.syncFromRoute(router.currentRoute.value);
	return router.afterEach((to, from, failure) => {
		if (!failure) store.syncFromRoute(to, from);
	});
}

function routeParam(route: RouteLocationNormalizedLoaded, name: string): string | null {
	const value = route.params[name];
	const first = Array.isArray(value) ? value[0] : value;
	return first || null;
}

/** The API wants numeric ports and the agent flag folded back into `type`. */
function toDbCredentials(connection: Connection): Record<string, unknown> {
	return {
		...connection,
		port: Number.parseInt(connection.port, 10),
		sshPort: Number.parseInt(connection.sshPort ?? '', 10),
		type: connection.connectionType === ConnectionType.Agent ? `agent_${connection.type}` : connection.type,
	};
}

const CONVERSION_DELAY_DAYS = 7;

// Google Ads "repeat visit" conversion: fired once, the first time the list loads a week or more
// after the first visit.
function checkAndSendConversion(): void {
	const now = new Date();
	const firstVisitTime = localStorage.getItem('first_visit_time');
	if (!firstVisitTime) {
		localStorage.setItem('first_visit_time', now.toISOString());
		return;
	}
	const days = Math.floor((now.getTime() - new Date(firstVisitTime).getTime()) / (1000 * 60 * 60 * 24));
	if (days < CONVERSION_DELAY_DAYS || localStorage.getItem('repeat_conversion_sent')) return;

	localStorage.setItem('repeat_conversion_sent', 'true');
	const { gtag } = window as Window & { gtag?: (...args: unknown[]) => void };
	gtag?.('event', 'conversion', {
		send_to: 'AW-419937947/jqGyCJWo4qobEJv9nsgB',
		value: 1.0,
		currency: 'USD',
	});
}
