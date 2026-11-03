// Ports the behaviour covered by frontend/src/app/services/tables.service.spec.ts, plus the
// events that replaced the `cast` strings.
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeError, jsonResponse, mockFetch, textResponse } from '@/__tests__/mock-fetch';
import { tableEvents } from '@/lib/table-events';
import { AlertType } from '@/models/alert';
import { useNotificationsStore } from '@/stores/notifications';
import { useTablesStore } from './tables';

vi.mock('@/environment', () => ({ environment: { apiRoot: '', saasURL: '' } }));
vi.mock('@/config', () => ({ getConfig: () => ({ baseURL: '/api', saasURL: '' }) }));

const analytics = vi.hoisted(() => ({ trackEvent: vi.fn(), capture: vi.fn() }));
vi.mock('@/composables/useAnalytics', () => ({ trackEvent: analytics.trackEvent }));
vi.mock('posthog-js', () => ({ default: { capture: analytics.capture } }));

const tableParams = { connectionID: '12345678', tableName: 'users_table', requstedPage: 1, chunkSize: 30 };

describe('tables store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		tableEvents.all.clear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function spyNotifications() {
		const notifications = useNotificationsStore();
		return {
			showAlert: vi.spyOn(notifications, 'showAlert'),
			showErrorSnackbar: vi.spyOn(notifications, 'showErrorSnackbar'),
			showSuccessSnackbar: vi.spyOn(notifications, 'showSuccessSnackbar'),
		};
	}

	function expectErrorAlert(showAlert: ReturnType<typeof spyNotifications>['showAlert']) {
		expect(showAlert).toHaveBeenCalledWith(
			AlertType.Error,
			{ abstract: fakeError.message, details: fakeError.originalMessage },
			[expect.objectContaining({ caption: 'Dismiss' })],
		);
	}

	it('sets and reads the current table name', () => {
		const store = useTablesStore();
		store.setTableName('users');
		expect(store.currentTableName).toBe('users');
	});

	it('fetchTables passes `hidden` only when set', async () => {
		const fetch = mockFetch(jsonResponse([{ table: 'users' }]), jsonResponse([]));
		const store = useTablesStore();
		expect(await store.fetchTables('12345678')).toEqual([{ table: 'users' }]);
		await store.fetchTables('12345678', true);
		expect(fetch.requests.map((request) => request.url)).toEqual([
			'/api/connection/tables/12345678',
			'/api/connection/tables/12345678?hidden=true',
		]);
	});

	it('fetchTables reports nothing and rethrows', async () => {
		mockFetch(jsonResponse(fakeError, 400));
		const { showAlert, showErrorSnackbar } = spyNotifications();
		await expect(useTablesStore().fetchTables('12345678')).rejects.toThrow();
		expect(showAlert).not.toHaveBeenCalled();
		expect(showErrorSnackbar).not.toHaveBeenCalled();
	});

	describe('fetchTable', () => {
		it('posts the filters with the minimal params', async () => {
			const fetch = mockFetch(jsonResponse({ rows: [] }));
			expect(await useTablesStore().fetchTable(tableParams)).toEqual({ rows: [] });
			expect(fetch.last().method).toBe('POST');
			expect(fetch.last().url).toBe('/api/table/rows/find/12345678?tableName=users_table&perPage=30&page=1');
			expect(fetch.last().json).toEqual({});
		});

		it('filters by a foreign key', async () => {
			const fetch = mockFetch(jsonResponse({ rows: [] }));
			await useTablesStore().fetchTable({
				...tableParams,
				foreignKeyRowName: 'position_id',
				foreignKeyRowValue: '9876',
				referencedColumn: 'id',
			});
			expect(fetch.last().url).toBe(
				'/api/table/rows/find/12345678?tableName=users_table&perPage=30&page=1&f_position_id__eq=9876&referencedColumn=id',
			);
		});

		it('uses the `autocomplete` param as is', async () => {
			const fetch = mockFetch(jsonResponse({ rows: [] }));
			await useTablesStore().fetchTable({
				...tableParams,
				foreignKeyRowName: 'autocomplete',
				foreignKeyRowValue: 'jo',
			});
			expect(fetch.last().url).toContain('&autocomplete=jo');
		});

		it('sends filters, search, sorting and the uncached flag', async () => {
			const fetch = mockFetch(jsonResponse({ rows: [] }));
			const filters = { city: { eq: 'NewYork' }, age: { eq: '42' } };
			await useTablesStore().fetchTable({
				...tableParams,
				filters,
				search: 'john',
				sortColumn: 'City',
				sortOrder: 'DESC',
				uncached: true,
			});
			expect(fetch.last().json).toEqual({ filters });
			expect(fetch.last().url).toBe(
				'/api/table/rows/find/12345678?tableName=users_table&perPage=30&page=1&search=john&sort_by=City&sort_order=DESC&_uncached=true',
			);
		});

		it('resolves null without a request when there is no table', async () => {
			const fetch = mockFetch();
			expect(await useTablesStore().fetchTable({ ...tableParams, tableName: '' })).toBeNull();
			expect(fetch.requests).toHaveLength(0);
		});

		it('shows an error alert on failure', async () => {
			mockFetch(jsonResponse(fakeError, 400));
			const { showAlert } = spyNotifications();
			await expect(useTablesStore().fetchTable(tableParams)).rejects.toThrow();
			expectErrorAlert(showAlert);
		});
	});

	it('fetchTableStructure requests the table and shows a snackbar on failure', async () => {
		const fetch = mockFetch(jsonResponse({ structure: [] }), jsonResponse(fakeError, 400));
		const { showErrorSnackbar } = spyNotifications();
		const store = useTablesStore();
		await store.fetchTableStructure('12345678', 'users_table');
		expect(fetch.last().url).toBe('/api/table/structure/12345678?tableName=users_table');
		await expect(store.fetchTableStructure('12345678', 'users_table')).rejects.toThrow();
		expect(showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
	});

	it('fetchTableSettings requests the settings and shows an alert on failure', async () => {
		const fetch = mockFetch(jsonResponse({ table_name: 'users_table' }), jsonResponse(fakeError, 400));
		const { showAlert } = spyNotifications();
		const store = useTablesStore();
		await store.fetchTableSettings('12345678', 'users_table');
		expect(fetch.last().url).toBe('/api/settings?connectionId=12345678&tableName=users_table');
		await expect(store.fetchTableSettings('12345678', 'users_table')).rejects.toThrow();
		expectErrorAlert(showAlert);
	});

	describe('table settings', () => {
		it.each([
			[true, 'PUT'],
			[false, 'POST'],
		])('updateTableSettings (exists: %s) uses %s, confirms and emits settingsUpdated', async (exists, method) => {
			const fetch = mockFetch(jsonResponse({}));
			const { showSuccessSnackbar } = spyNotifications();
			const listener = vi.fn();
			tableEvents.on('settingsUpdated', listener);

			await useTablesStore().updateTableSettings(exists, '12345678', 'users_table', { icon: 'star' });

			expect(fetch.last().method).toBe(method);
			expect(fetch.last().url).toBe('/api/settings?connectionId=12345678&tableName=users_table');
			expect(fetch.last().json).toEqual({ icon: 'star' });
			expect(showSuccessSnackbar).toHaveBeenCalledWith('Table settings has been updated.');
			expect(listener).toHaveBeenCalledWith({ connectionID: '12345678', tableName: 'users_table', personal: false });
		});

		it('updateTableSettings shows an alert and emits nothing on failure', async () => {
			mockFetch(jsonResponse(fakeError, 400));
			const { showAlert } = spyNotifications();
			const listener = vi.fn();
			tableEvents.on('settingsUpdated', listener);
			await expect(useTablesStore().updateTableSettings(true, '1', 't', {})).rejects.toThrow();
			expectErrorAlert(showAlert);
			expect(listener).not.toHaveBeenCalled();
		});

		it('deleteTableSettings resets and confirms', async () => {
			const fetch = mockFetch(jsonResponse(null));
			const { showSuccessSnackbar } = spyNotifications();
			await useTablesStore().deleteTableSettings('12345678', 'users_table');
			expect(fetch.last().method).toBe('DELETE');
			expect(showSuccessSnackbar).toHaveBeenCalledWith('Table settings has been reset.');
		});

		it('updatePersonalTableViewSettings saves silently and emits a personal settingsUpdated', async () => {
			const fetch = mockFetch(jsonResponse({}));
			const { showSuccessSnackbar } = spyNotifications();
			const listener = vi.fn();
			tableEvents.on('settingsUpdated', listener);
			await useTablesStore().updatePersonalTableViewSettings('12345678', 'users_table', { list_per_page: 50 });
			expect(fetch.last().url).toBe('/api/settings/personal/12345678?tableName=users_table');
			expect(showSuccessSnackbar).not.toHaveBeenCalled();
			expect(listener).toHaveBeenCalledWith(expect.objectContaining({ personal: true }));
		});
	});

	describe('widgets', () => {
		it('fetchTableWidgets requests the widgets and shows an alert on failure', async () => {
			const fetch = mockFetch(jsonResponse([]), jsonResponse(fakeError, 400));
			const { showAlert } = spyNotifications();
			const store = useTablesStore();
			await store.fetchTableWidgets('12345678', 'users_table');
			expect(fetch.last().url).toBe('/api/widgets/12345678?tableName=users_table');
			await expect(store.fetchTableWidgets('12345678', 'users_table')).rejects.toThrow();
			expectErrorAlert(showAlert);
		});

		it('updateTableWidgets posts the widgets and confirms', async () => {
			const fetch = mockFetch(jsonResponse([]));
			const { showSuccessSnackbar } = spyNotifications();
			const widgets = [
				{ field_name: 'email', widget_type: 'Email', widget_params: '', name: 'Email', description: '' },
			];
			await useTablesStore().updateTableWidgets('12345678', 'users_table', widgets);
			expect(fetch.last().url).toBe('/api/widget/12345678?tableName=users_table');
			expect(fetch.last().json).toEqual({ widgets });
			expect(showSuccessSnackbar).toHaveBeenCalledWith('Table widgets has been updated.');
		});
	});

	describe('csv', () => {
		it('exportTableCSV returns the CSV text', async () => {
			const fetch = mockFetch(textResponse('id,name\n1,John'));
			const csv = await useTablesStore().exportTableCSV({
				connectionID: '12345678',
				tableName: 'users_table',
				chunkSize: 500,
				sortColumn: 'name',
				sortOrder: 'ASC',
			});
			expect(csv).toBe('id,name\n1,John');
			expect(fetch.last().url).toBe(
				'/api/table/csv/export/12345678?perPage=500&page=1&tableName=users_table&sort_by=name&sort_order=ASC',
			);
		});

		it('exportTableCSV shows the server message and tracks the failure', async () => {
			mockFetch(jsonResponse(fakeError, 400));
			const { showErrorSnackbar } = spyNotifications();
			await expect(
				useTablesStore().exportTableCSV({ connectionID: '1', tableName: 't', chunkSize: 10 }),
			).rejects.toThrow();
			expect(showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
			expect(analytics.trackEvent).toHaveBeenCalledWith('Dashboard: db export failed');
			expect(analytics.capture).toHaveBeenCalledWith('Dashboard: db export failed');
		});

		it('importTableCSV uploads the file as form data, confirms and emits imported', async () => {
			const fetch = mockFetch(jsonResponse({}));
			const { showSuccessSnackbar } = spyNotifications();
			const listener = vi.fn();
			tableEvents.on('imported', listener);
			const file = new File(['id\n1'], 'users.csv', { type: 'text/csv' });

			await useTablesStore().importTableCSV('12345678', 'users_table', file);

			const body = fetch.last().body;
			expect(body).toBeInstanceOf(FormData);
			expect((body as FormData).get('file')).toBeInstanceOf(File);
			expect(showSuccessSnackbar).toHaveBeenCalledWith('CSV file has been imported successfully.');
			expect(listener).toHaveBeenCalledWith({ connectionID: '12345678', tableName: 'users_table' });
		});

		it('importTableCSV tracks failures', async () => {
			mockFetch(jsonResponse(fakeError, 400));
			await expect(useTablesStore().importTableCSV('1', 't', new File([''], 'x.csv'))).rejects.toThrow();
			expect(analytics.capture).toHaveBeenCalledWith('Dashboard: db import failed');
		});
	});

	describe('rows and actions', () => {
		it('bulkDelete puts the primary keys, confirms and emits rowsDeleted', async () => {
			const fetch = mockFetch(jsonResponse({}));
			const { showSuccessSnackbar } = spyNotifications();
			const listener = vi.fn();
			tableEvents.on('rowsDeleted', listener);
			await useTablesStore().bulkDelete('12345678', 'users_table', [{ id: 1 }, { id: 2 }]);
			expect(fetch.last().method).toBe('PUT');
			expect(fetch.last().url).toBe('/api/table/rows/delete/12345678?tableName=users_table');
			expect(fetch.last().json).toEqual([{ id: 1 }, { id: 2 }]);
			expect(showSuccessSnackbar).toHaveBeenCalledWith('Rows have been deleted successfully.');
			expect(listener).toHaveBeenCalled();
		});

		it('activateActions reports how many rows the action ran on', async () => {
			const fetch = mockFetch(jsonResponse({}));
			const { showSuccessSnackbar } = spyNotifications();
			const listener = vi.fn();
			tableEvents.on('actionsActivated', listener);
			await useTablesStore().activateActions('12345678', 'users_table', 'action-1', 'Send email', [{ id: 1 }]);
			expect(fetch.last().url).toBe('/api/event/actions/activate/action-1/12345678');
			expect(showSuccessSnackbar).toHaveBeenCalledWith('Send email is done for 1 rows.');
			expect(listener).toHaveBeenCalledWith(expect.objectContaining({ actionId: 'action-1' }));
		});

		it('saveRule, updateRule and deleteRule confirm with the rule title', async () => {
			const rule = { id: 'r1', title: 'Notify', table_name: 'users_table', events: [], table_actions: [] };
			const fetch = mockFetch(jsonResponse(rule), jsonResponse(rule), jsonResponse(rule));
			const { showSuccessSnackbar } = spyNotifications();
			const listener = vi.fn();
			tableEvents.on('ruleDeleted', listener);
			const store = useTablesStore();

			await store.saveRule('12345678', 'users_table', rule);
			await store.updateRule('12345678', 'users_table', rule);
			await store.deleteRule('12345678', 'users_table', 'r1');

			expect(fetch.requests.map((request) => `${request.method} ${request.url}`)).toEqual([
				'POST /api/action/rule/12345678',
				'PUT /api/action/rule/r1/12345678',
				'DELETE /api/action/rule/r1/12345678',
			]);
			expect(showSuccessSnackbar.mock.calls.map(([message]) => message)).toEqual([
				'Notify action has been created.',
				'Notify action has been updated.',
				'Notify action has been deleted.',
			]);
			expect(listener).toHaveBeenCalledWith({ connectionID: '12345678', tableName: 'users_table', ruleId: 'r1' });
		});
	});

	describe('saved filters', () => {
		it('getSavedFilters rethrows without notifying', async () => {
			mockFetch(jsonResponse(fakeError, 400));
			const { showAlert, showErrorSnackbar } = spyNotifications();
			await expect(useTablesStore().getSavedFilters('1', 't')).rejects.toThrow(fakeError.message);
			expect(showAlert).not.toHaveBeenCalled();
			expect(showErrorSnackbar).not.toHaveBeenCalled();
		});

		it('create, update and delete emit their events and confirm', async () => {
			mockFetch(jsonResponse({ id: 'f1' }), jsonResponse({ id: 'f1' }), jsonResponse({}));
			const { showSuccessSnackbar } = spyNotifications();
			const events = vi.fn();
			tableEvents.on('*', events);
			const store = useTablesStore();

			await store.createSavedFilter('1', 't', { name: 'Mine' });
			await store.updateSavedFilter('1', 't', 'f1', { name: 'Mine' });
			await store.deleteSavedFilter('1', 't', 'f1');

			expect(events.mock.calls.map(([type]) => type)).toEqual([
				'savedFilterCreated',
				'savedFilterUpdated',
				'savedFilterDeleted',
			]);
			expect(showSuccessSnackbar.mock.calls.map(([message]) => message)).toEqual([
				'Saved filters have been updated.',
				'Saved filter has been updated.',
				'Saved filter has been deleted.',
			]);
		});

		it('saved filter failures show an error snackbar', async () => {
			mockFetch(jsonResponse(fakeError, 400));
			const { showErrorSnackbar } = spyNotifications();
			await expect(useTablesStore().createSavedFilter('1', 't', {})).rejects.toThrow();
			expect(showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
		});
	});
});
