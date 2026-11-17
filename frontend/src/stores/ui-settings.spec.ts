import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { api } from '@/api/client';
import type { UiSettings } from '@/models/ui-settings';
import { useUiSettingsStore } from './ui-settings';

vi.mock('@/api/client', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

const get = vi.mocked(api.get);
const post = vi.mocked(api.post);

const stored: UiSettings = {
	globalSettings: { connectionsListCollapsed: true, lastFeatureNotificationId: 'n1' },
	connections: { 'conn-1': { shownTableTitles: true, tables: { users: { shownColumns: ['id'] } } } },
};

function lastUpload(): UiSettings {
	const body = post.mock.calls.at(-1)?.[1] as { userSettings: string };
	return JSON.parse(body.userSettings) as UiSettings;
}

describe('ui-settings store', () => {
	beforeEach(() => {
		localStorage.clear();
		delete document.documentElement.dataset.theme;
		setActivePinia(createPinia());
		vi.clearAllMocks();
		post.mockImplementation(async (_url, body) => body as never);
	});

	it('fetches the settings once and serves them from memory afterwards', async () => {
		get.mockResolvedValue({ userSettings: JSON.stringify(stored) });
		const store = useUiSettingsStore();

		const [first, second] = await Promise.all([store.getUiSettings(), store.getUiSettings()]);
		const third = await store.getUiSettings();

		expect(get).toHaveBeenCalledOnce();
		expect(get).toHaveBeenCalledWith('/user/settings', { notify: 'snackbar' });
		expect(first).toEqual(stored);
		expect(second).toEqual(stored);
		expect(third).toEqual(stored);
		expect(store.settings).toEqual(stored);
	});

	it('resolves null when nothing is stored yet, and asks again next time', async () => {
		get.mockResolvedValue({ userSettings: null });
		const store = useUiSettingsStore();

		await expect(store.getUiSettings()).resolves.toBeNull();
		await store.getUiSettings();

		expect(get).toHaveBeenCalledTimes(2);
	});

	it('uploads the whole blob when a global setting changes', async () => {
		get.mockResolvedValue({ userSettings: JSON.stringify(stored) });
		const store = useUiSettingsStore();
		await store.getUiSettings();

		store.updateGlobalSetting('lastFeatureNotificationId', 'n2');

		expect(post).toHaveBeenCalledWith('/user/settings', expect.any(Object), { notify: 'snackbar' });
		expect(lastUpload().globalSettings).toEqual({ connectionsListCollapsed: true, lastFeatureNotificationId: 'n2' });
		expect(lastUpload().connections).toEqual(stored.connections);
	});

	it('creates a connection entry on its first setting', () => {
		const store = useUiSettingsStore();

		store.updateConnectionSetting('conn-2', 'dashboardsSidebarCollapsed', true);

		expect(lastUpload().connections['conn-2']).toEqual({
			shownTableTitles: false,
			tables: {},
			dashboardsSidebarCollapsed: true,
		});
	});

	it('creates the connection and table entries on a table setting', () => {
		const store = useUiSettingsStore();

		store.updateTableSetting('conn-3', 'orders', 'shownColumns', ['id', 'total']);

		expect(lastUpload().connections['conn-3']?.tables.orders).toEqual({ shownColumns: ['id', 'total'] });
	});

	it('swallows a failed sync (the client already reported it)', async () => {
		post.mockRejectedValueOnce(new Error('offline'));
		const store = useUiSettingsStore();

		expect(() => store.updateGlobalSetting('connectionsListCollapsed', true)).not.toThrow();
		await Promise.resolve();
		expect(store.settings.globalSettings.connectionsListCollapsed).toBe(true);
	});

	it('remembers what the server confirmed after a sync', async () => {
		const store = useUiSettingsStore();
		await store.syncUiSettings();
		expect(store.loadedSettings).toEqual({ globalSettings: {}, connections: {} });
	});

	describe('theme', () => {
		it('follows the system until the user picks a theme', () => {
			const store = useUiSettingsStore();
			expect(store.theme).toBe('system');
			expect(document.documentElement.dataset.theme).toBe(store.isDarkMode ? 'dark' : 'light');
		});

		it('starts from the theme this browser remembers', () => {
			localStorage.setItem('theme', 'dark');
			const store = useUiSettingsStore();
			expect(store.isDarkMode).toBe(true);
			expect(document.documentElement.dataset.theme).toBe('dark');
		});

		it('applies the theme stored on the account when the settings load', async () => {
			get.mockResolvedValue({
				userSettings: JSON.stringify({ ...stored, globalSettings: { ...stored.globalSettings, theme: 'dark' } }),
			});
			const store = useUiSettingsStore();
			await store.getUiSettings();
			await nextTick();

			expect(store.theme).toBe('dark');
			expect(document.documentElement.dataset.theme).toBe('dark');
			expect(localStorage.getItem('theme')).toBe('dark');
		});

		it('applies a new theme at once and saves it after the stored settings load', async () => {
			get.mockResolvedValue({
				userSettings: JSON.stringify({ ...stored, globalSettings: { ...stored.globalSettings, theme: 'dark' } }),
			});
			const store = useUiSettingsStore();
			store.setTheme('light');
			await nextTick();
			expect(document.documentElement.dataset.theme).toBe('light');

			await flushPromises();
			expect(store.theme).toBe('light');
			expect(lastUpload().globalSettings).toEqual({ ...stored.globalSettings, theme: 'light' });
			expect(lastUpload().connections).toEqual(stored.connections);
		});

		it('does not upload a theme when the stored settings fail to load', async () => {
			get.mockRejectedValue(new Error('offline'));
			const store = useUiSettingsStore();
			store.setTheme('dark');
			await flushPromises();

			expect(store.theme).toBe('dark');
			expect(post).not.toHaveBeenCalled();
		});
	});
});
