import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
});
