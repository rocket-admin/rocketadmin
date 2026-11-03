// Port of TablesService: table lists and folders, rows, structure, settings, widgets, rules
// (actions), CSV import/export and saved filters. The current table name follows the route via
// `syncFromRoute`, wired up by `bindTablesToRouter(router)`.
//
// The string events of `cast` are now typed events on `tableEvents` (src/lib/table-events.ts).
// createAIthread/requestAImessage were not ported: nothing in the Angular app calls them (the AI
// panel talks to /ai/v4 through its own service).
import { defineStore } from 'pinia';
import posthog from 'posthog-js';
import { ref } from 'vue';
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router';
import { api, isApiError } from '@/api/client';
import { trackEvent } from '@/composables/useAnalytics';
import { tableEvents } from '@/lib/table-events';
import type { TableCategory } from '@/models/connection';
import type {
	PersonalTableViewSettings,
	Rule,
	TableField,
	TableForeignKey,
	TableProperties,
	TableSettings,
	Widget,
} from '@/models/table';
import { useNotificationsStore } from '@/stores/notifications';

export enum SortOrdering {
	Ascending = 'ASC',
	Descending = 'DESC',
}

export interface TableParams {
	connectionID: string;
	tableName: string;
	requstedPage: number;
	chunkSize: number;
	sortColumn?: string;
	sortOrder?: 'ASC' | 'DESC';
	foreignKeyRowName?: string;
	foreignKeyRowValue?: string;
	referencedColumn?: string;
	filters?: object;
	comparators?: object;
	search?: string;
	uncached?: boolean;
}

export interface ExportTableParams {
	connectionID: string;
	tableName: string;
	chunkSize: number;
	sortColumn?: string;
	sortOrder?: 'ASC' | 'DESC';
	filters?: object;
	search?: string;
}

/** GET /table-categories/v2/:id — the sidebar folders, each with its tables. */
export interface TableFolder extends Omit<TableCategory, 'tables'> {
	tables: TableProperties[];
}

/** POST /table/rows/find/:id. Only the commonly read fields are typed; the rest pass through. */
export interface TableRowsResponse {
	rows: Record<string, unknown>[];
	structure: TableField[];
	primaryColumns: { column_name: string; data_type: string }[];
	foreignKeys: TableForeignKey[];
	widgets: Widget[];
	pagination: { total: number; lastPage: number; perPage: number; currentPage: number };
	[key: string]: unknown;
}

export interface TableStructureResponse {
	structure: TableField[];
	primaryColumns: { column_name: string; data_type: string }[];
	foreignKeys: TableForeignKey[];
	readonly_fields: string[];
	table_widgets: Widget[];
	[key: string]: unknown;
}

export interface RulesResponse {
	action_rules: Rule[];
	[key: string]: unknown;
}

export interface SavedFilter {
	id: string;
	name: string;
	filters: Record<string, unknown>;
	[key: string]: unknown;
}

type PrimaryKey = Record<string, unknown>;

export const useTablesStore = defineStore('tables', () => {
	const notifications = useNotificationsStore();
	const tableName = ref<string | null>(null);

	function setTableName(name: string | null): void {
		tableName.value = name;
	}

	function syncFromRoute(route: RouteLocationNormalizedLoaded): void {
		const value = route.params.tableName;
		setTableName((Array.isArray(value) ? value[0] : value) || null);
	}

	// No catchError in Angular: the caller sees the error and nothing is shown.
	function fetchTables(connectionID: string, hidden?: boolean): Promise<TableProperties[]> {
		return api.get<TableProperties[]>(`/connection/tables/${connectionID}`, {
			params: hidden ? { hidden } : undefined,
			notify: false,
		});
	}

	function fetchTablesFolders(connectionID: string, hidden?: boolean): Promise<TableFolder[]> {
		return api.get<TableFolder[]>(`/table-categories/v2/${connectionID}`, {
			params: hidden ? { hidden } : undefined,
			notify: false,
		});
	}

	function updateTablesFolders(connectionID: string, tablesFolders: TableCategory[]): Promise<TableCategory[]> {
		return api.put<TableCategory[]>(`/table-categories/${connectionID}`, tablesFolders, { notify: 'snackbar' });
	}

	/** Resolves null without a request when there is no table name, as the Angular method did. */
	function fetchTable<T = TableRowsResponse>({
		connectionID,
		tableName: name,
		requstedPage,
		chunkSize,
		sortColumn,
		sortOrder,
		foreignKeyRowName,
		foreignKeyRowValue,
		referencedColumn,
		filters,
		search,
		uncached,
	}: TableParams): Promise<T | null> {
		if (!name) return Promise.resolve(null);
		const foreignKeyParam = foreignKeyRowName === 'autocomplete' ? foreignKeyRowName : `f_${foreignKeyRowName}__eq`;
		return api.post<T>(
			`/table/rows/find/${connectionID}`,
			{ filters },
			{
				params: {
					tableName: name,
					perPage: chunkSize,
					page: requstedPage,
					search: search || undefined,
					...(foreignKeyRowValue ? { [foreignKeyParam]: foreignKeyRowValue } : {}),
					referencedColumn: referencedColumn || undefined,
					sort_by: sortColumn || undefined,
					sort_order: sortOrder || undefined,
					_uncached: uncached ? 'true' : undefined,
				},
				notify: 'alert',
			},
		);
	}

	function fetchTableStructure<T = TableStructureResponse>(connectionID: string, name: string): Promise<T> {
		return api.get<T>(`/table/structure/${connectionID}`, { params: { tableName: name }, notify: 'snackbar' });
	}

	function fetchTableSettings(connectionID: string, name: string): Promise<TableSettings | null> {
		return api.get<TableSettings | null>('/settings', {
			params: { connectionId: connectionID, tableName: name },
			notify: 'alert',
		});
	}

	/** CSV text. On failure the server's error is shown and the failure is tracked. */
	async function exportTableCSV({
		connectionID,
		tableName: name,
		chunkSize,
		sortColumn,
		sortOrder,
		filters,
		search,
	}: ExportTableParams): Promise<string> {
		try {
			return await api.post<string>(
				`/table/csv/export/${connectionID}`,
				{ filters },
				{
					params: {
						perPage: chunkSize,
						page: 1,
						tableName: name,
						search: search || undefined,
						sort_by: sortColumn || undefined,
						sort_order: sortOrder || undefined,
					},
					responseType: 'text',
					notify: 'snackbar',
				},
			);
		} catch (error) {
			if (isApiError(error)) trackFailure('Dashboard: db export failed');
			throw error;
		}
	}

	async function importTableCSV(connectionID: string, name: string, file: File): Promise<unknown> {
		const formData = new FormData();
		formData.append('file', file);
		try {
			const res = await api.post(`/table/csv/import/${connectionID}`, formData, {
				params: { tableName: name },
				notify: 'snackbar',
				successMessage: 'CSV file has been imported successfully.',
			});
			tableEvents.emit('imported', { connectionID, tableName: name });
			return res;
		} catch (error) {
			if (isApiError(error)) trackFailure('Dashboard: db import failed');
			throw error;
		}
	}

	async function updateTableSettings(
		isSettingsExist: boolean,
		connectionID: string,
		name: string,
		settings: Partial<TableSettings>,
	): Promise<void> {
		const send = isSettingsExist ? api.put : api.post;
		await send('/settings', settings, {
			params: { connectionId: connectionID, tableName: name },
			notify: 'alert',
			successMessage: 'Table settings has been updated.',
		});
		tableEvents.emit('settingsUpdated', { connectionID, tableName: name, personal: false });
	}

	async function deleteTableSettings(connectionID: string, name: string): Promise<void> {
		await api.delete('/settings', {
			params: { connectionId: connectionID, tableName: name },
			notify: 'alert',
			successMessage: 'Table settings has been reset.',
		});
		tableEvents.emit('settingsUpdated', { connectionID, tableName: name, personal: false });
	}

	function fetchTableWidgets(connectionID: string, name: string): Promise<Widget[]> {
		return api.get<Widget[]>(`/widgets/${connectionID}`, { params: { tableName: name }, notify: 'alert' });
	}

	function updateTableWidgets(connectionID: string, name: string, widgets: Widget[]): Promise<Widget[]> {
		return api.post<Widget[]>(
			`/widget/${connectionID}`,
			{ widgets },
			{ params: { tableName: name }, notify: 'alert', successMessage: 'Table widgets has been updated.' },
		);
	}

	async function bulkDelete(connectionID: string, name: string, primaryKeys: PrimaryKey[]): Promise<unknown> {
		const res = await api.put(`/table/rows/delete/${connectionID}`, primaryKeys, {
			params: { tableName: name },
			notify: 'alert',
			successMessage: 'Rows have been deleted successfully.',
		});
		tableEvents.emit('rowsDeleted', { connectionID, tableName: name });
		return res;
	}

	function fetchRules(connectionID: string, name: string): Promise<RulesResponse> {
		return api.get<RulesResponse>(`/action/rules/${connectionID}`, { params: { tableName: name }, notify: 'alert' });
	}

	// The success message names the saved rule, so it can't be a static `successMessage`.
	async function saveRule(connectionID: string, _tableName: string, rule: Rule): Promise<Rule> {
		const res = await api.post<Rule>(`/action/rule/${connectionID}`, rule, { notify: 'alert' });
		notifications.showSuccessSnackbar(`${res.title} action has been created.`);
		return res;
	}

	async function updateRule(connectionID: string, _tableName: string, rule: Rule): Promise<Rule> {
		const res = await api.put<Rule>(`/action/rule/${rule.id}/${connectionID}`, rule, { notify: 'alert' });
		notifications.showSuccessSnackbar(`${res.title} action has been updated.`);
		return res;
	}

	async function deleteRule(connectionID: string, name: string, ruleId: string): Promise<Rule> {
		const res = await api.delete<Rule>(`/action/rule/${ruleId}/${connectionID}`, { notify: 'alert' });
		tableEvents.emit('ruleDeleted', { connectionID, tableName: name, ruleId });
		notifications.showSuccessSnackbar(`${res.title} action has been deleted.`);
		return res;
	}

	async function activateActions(
		connectionID: string,
		name: string,
		actionId: string,
		actionTitle: string,
		primaryKeys: PrimaryKey[],
	): Promise<unknown> {
		const res = await api.post(`/event/actions/activate/${actionId}/${connectionID}`, primaryKeys, {
			notify: 'alert',
			successMessage: `${actionTitle} is done for ${primaryKeys.length} rows.`,
		});
		tableEvents.emit('actionsActivated', { connectionID, tableName: name, actionId });
		return res;
	}

	async function updatePersonalTableViewSettings(
		connectionID: string,
		name: string,
		settings: PersonalTableViewSettings,
	): Promise<void> {
		await api.put(`/settings/personal/${connectionID}`, settings, { params: { tableName: name }, notify: 'alert' });
		tableEvents.emit('settingsUpdated', { connectionID, tableName: name, personal: true });
	}

	// Angular rethrew without showing anything; the saved-filters panel handles it.
	function getSavedFilters(connectionID: string, name: string): Promise<SavedFilter[]> {
		return api.get<SavedFilter[]>(`/table-filters/${connectionID}/all`, { params: { tableName: name }, notify: false });
	}

	async function createSavedFilter(connectionID: string, name: string, filters: object): Promise<SavedFilter> {
		const res = await api.post<SavedFilter>(`/table-filters/${connectionID}`, filters, {
			params: { tableName: name },
			notify: 'snackbar',
			successMessage: 'Saved filters have been updated.',
		});
		tableEvents.emit('savedFilterCreated', { connectionID, tableName: name });
		return res;
	}

	async function updateSavedFilter(
		connectionID: string,
		name: string,
		filterId: string,
		filters: object,
	): Promise<SavedFilter> {
		const res = await api.put<SavedFilter>(`/table-filters/${connectionID}/${filterId}`, filters, {
			params: { tableName: name },
			notify: 'snackbar',
			successMessage: 'Saved filter has been updated.',
		});
		tableEvents.emit('savedFilterUpdated', { connectionID, tableName: name, filterId });
		return res;
	}

	async function deleteSavedFilter(connectionID: string, name: string, filterId: string): Promise<unknown> {
		const res = await api.delete(`/table-filters/${connectionID}/${filterId}`, {
			params: { tableName: name },
			notify: 'snackbar',
			successMessage: 'Saved filter has been deleted.',
		});
		tableEvents.emit('savedFilterDeleted', { connectionID, tableName: name, filterId });
		return res;
	}

	return {
		tableName,
		/** Alias of tableName, the Angular getter name. */
		currentTableName: tableName,
		setTableName,
		syncFromRoute,
		fetchTables,
		fetchTablesFolders,
		updateTablesFolders,
		fetchTable,
		fetchTableStructure,
		fetchTableSettings,
		exportTableCSV,
		importTableCSV,
		updateTableSettings,
		deleteTableSettings,
		fetchTableWidgets,
		updateTableWidgets,
		bulkDelete,
		fetchRules,
		saveRule,
		updateRule,
		deleteRule,
		activateActions,
		updatePersonalTableViewSettings,
		getSavedFilters,
		createSavedFilter,
		updateSavedFilter,
		deleteSavedFilter,
	};
});

/** Keeps `tableName` in step with the route's `:tableName`. Returns the function that removes the hook. */
export function bindTablesToRouter(router: Router): () => void {
	const store = useTablesStore();
	store.syncFromRoute(router.currentRoute.value);
	return router.afterEach((to, _from, failure) => {
		if (!failure) store.syncFromRoute(to);
	});
}

function trackFailure(action: string): void {
	trackEvent(action);
	posthog.capture(action);
}
