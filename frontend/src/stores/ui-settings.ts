// Port of frontend/src/app/services/ui-settings.service.ts: per-user UI preferences (collapsed
// panels, shown columns, the last feature notification seen), stored server-side as one JSON blob
// in /user/settings. The store also owns the colour theme: it applies `globalSettings.theme` to the
// page.
//
// Shape of the blob:
//   { globalSettings: { connectionsListCollapsed, theme },
//     connections: { [connectionId]: { shownTableTitles, tables: { [tableName]: { shownColumns } } } } }
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { api } from '@/api/client';
import {
	applyTheme,
	isThemePreference,
	onSystemThemeChange,
	readStoredTheme,
	storeTheme,
	systemPrefersDark,
	type ThemePreference,
} from '@/lib/color-theme';
import type { ConnectionSettingsUI, GlobalSettingsUI, TableSettingsUI, UiSettings } from '@/models/ui-settings';

interface UserSettingsResponse {
	userSettings?: string | null;
}

export const useUiSettingsStore = defineStore('uiSettings', () => {
	/** The working copy every update writes into and every sync uploads. */
	const settings = ref<UiSettings>(emptySettings());
	/** The last settings the server confirmed; null until they are loaded (or when none are stored). */
	const loadedSettings = ref<UiSettings | null>(null);
	/** The user's theme choice. The account settings page changes it. */
	const theme = ref<ThemePreference>(readStoredTheme());
	const systemDark = ref(systemPrefersDark());
	/** The resolved theme. The Monaco editors and the database logos pick their variant from it. */
	const isDarkMode = computed(() => (theme.value === 'system' ? systemDark.value : theme.value === 'dark'));
	let pending: Promise<UiSettings | null> | null = null;

	onSystemThemeChange((dark) => {
		systemDark.value = dark;
	});
	watch(isDarkMode, applyTheme, { immediate: true });

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
					const storedTheme = parsed?.globalSettings?.theme;
					if (isThemePreference(storedTheme)) selectTheme(storedTheme);
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

	/**
	 * Applies `value` at once and saves it to the account. The upload waits for the stored settings,
	 * so that it does not replace them with an empty copy.
	 */
	function setTheme(value: ThemePreference): void {
		selectTheme(value);
		getUiSettings().then(
			() => {
				// The loaded settings can carry the previous choice. The new choice wins.
				selectTheme(value);
				updateGlobalSetting('theme', value);
			},
			() => {},
		);
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

	function selectTheme(value: ThemePreference): void {
		theme.value = value;
		storeTheme(value);
	}

	function connectionSettings(connectionId: string): ConnectionSettingsUI {
		settings.value.connections[connectionId] ??= { shownTableTitles: false, tables: {} };
		return settings.value.connections[connectionId];
	}

	return {
		settings,
		loadedSettings,
		theme,
		isDarkMode,
		getUiSettings,
		setTheme,
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
