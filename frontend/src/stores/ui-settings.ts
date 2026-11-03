// Port of frontend/src/app/services/ui-settings.service.ts: per-user UI preferences (collapsed
// panels, shown columns, the last feature notification seen), stored server-side as one JSON blob
// in /user/settings.
//
// Shape of the blob:
//   { globalSettings: { connectionsListCollapsed },
//     connections: { [connectionId]: { shownTableTitles, tables: { [tableName]: { shownColumns } } } } }
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api/client';
import type { ConnectionSettingsUI, GlobalSettingsUI, TableSettingsUI, UiSettings } from '@/models/ui-settings';

interface UserSettingsResponse {
	userSettings?: string | null;
}

export const useUiSettingsStore = defineStore('uiSettings', () => {
	/** The working copy every update writes into and every sync uploads. */
	const settings = ref<UiSettings>(emptySettings());
	/** The last settings the server confirmed; null until they are loaded (or when none are stored). */
	const loadedSettings = ref<UiSettings | null>(null);
	/** Read once, like the Angular service: the Monaco editors pick their theme from it. */
	const isDarkMode = ref(prefersDarkMode());
	let pending: Promise<UiSettings | null> | null = null;

	/**
	 * The stored settings, fetched once and then served from memory. Resolves null when the user has
	 * none yet (and then asks again next time, as Angular did).
	 */
	function getUiSettings(): Promise<UiSettings | null> {
		if (loadedSettings.value) return Promise.resolve(loadedSettings.value);
		if (!pending) {
			pending = api
				.get<UserSettingsResponse>('/user/settings', { notify: 'snackbar' })
				.then((response) => {
					const parsed = parseSettings(response);
					if (parsed) settings.value = parsed;
					loadedSettings.value = parsed;
					return parsed;
				})
				.finally(() => {
					pending = null;
				});
		}
		return pending;
	}

	function updateGlobalSetting<K extends keyof GlobalSettingsUI>(key: K, value: GlobalSettingsUI[K]): void {
		settings.value.globalSettings[key] = value;
		syncUiSettings().catch(() => {});
	}

	function updateConnectionSetting<K extends keyof ConnectionSettingsUI>(
		connectionId: string,
		key: K,
		value: ConnectionSettingsUI[K],
	): void {
		connectionSettings(connectionId)[key] = value;
		syncUiSettings().catch(() => {});
	}

	function updateTableSetting<K extends keyof TableSettingsUI>(
		connectionId: string,
		tableName: string,
		key: K,
		value: TableSettingsUI[K],
	): void {
		const connection = connectionSettings(connectionId);
		// Angular threw here for a table without settings yet; start it empty instead.
		connection.tables[tableName] ??= {};
		connection.tables[tableName][key] = value;
		syncUiSettings().catch(() => {});
	}

	async function syncUiSettings(): Promise<UserSettingsResponse> {
		const response = await api.post<UserSettingsResponse>(
			'/user/settings',
			{ userSettings: JSON.stringify(settings.value) },
			{ notify: 'snackbar' },
		);
		loadedSettings.value = parseSettings(response);
		return response;
	}

	function connectionSettings(connectionId: string): ConnectionSettingsUI {
		settings.value.connections[connectionId] ??= { shownTableTitles: false, tables: {} };
		return settings.value.connections[connectionId];
	}

	return {
		settings,
		loadedSettings,
		isDarkMode,
		getUiSettings,
		updateGlobalSetting,
		updateConnectionSetting,
		updateTableSetting,
		syncUiSettings,
	};
});

function emptySettings(): UiSettings {
	return { globalSettings: {} as GlobalSettingsUI, connections: {} };
}

function parseSettings(response: UserSettingsResponse | null): UiSettings | null {
	return response?.userSettings ? (JSON.parse(response.userSettings) as UiSettings) : null;
}

function prefersDarkMode(): boolean {
	return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
