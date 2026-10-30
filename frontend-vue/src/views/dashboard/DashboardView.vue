<script setup lang="ts">
// Port of components/dashboard (DashboardComponent): the table browser page, for both
// /dashboard/:connectionId (which opens the default or first table) and
// /dashboard/:connectionId/:tableName. It loads the table folders, keeps the sidebar (TablesList),
// owns the rows (useTableData) and the row selection, applies filters/search from the table view
// and writes them to the URL, runs custom actions, and hosts the row preview and the AI panel.
//
// URL state (see lib/table-query.ts): when the table changes, the page, page size, sort, filters,
// search and `uncached` are read from the query, as setTable did from the snapshot. Filters and
// search are written back by navigating, exactly like the Angular router calls. The string events
// of TablesService/TableRowService.cast are the typed tableEvents bus.
import { omitBy } from 'lodash-es';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { isApiError } from '@/api/client';
import ActionLinkDialog from '@/components/dashboard/ActionLinkDialog.vue';
import { track } from '@/components/dashboard/analytics';
import BulkActionConfirmationDialog from '@/components/dashboard/BulkActionConfirmationDialog.vue';
import TableAiPanel from '@/components/dashboard/TableAiPanel.vue';
import TableFiltersDialog, { type TableFiltersDialogData } from '@/components/dashboard/TableFiltersDialog.vue';
import TableRowView from '@/components/dashboard/TableRowView.vue';
import TablesList from '@/components/dashboard/TablesList.vue';
import TableView from '@/components/dashboard/TableView.vue';
import {
	type ActivateActionsPayload,
	type OpenFiltersPayload,
	readFiltersDialogResult,
	type SavedFilterSelection,
} from '@/components/dashboard/types';
import SchemaEditor from '@/components/schema/SchemaEditor.vue';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppBanner from '@/components/shared/AppBanner.vue';
import AppContentLoader from '@/components/shared/AppContentLoader.vue';
import PlaceholderTableView from '@/components/skeletons/PlaceholderTableView.vue';
import { UiButton, UiIcon, UiIconButton } from '@/components/ui';
import { useDialog } from '@/composables/useDialog';
import { useRowSelection } from '@/composables/useRowSelection';
import { useTableData } from '@/composables/useTableData';
import { environment } from '@/environment';
import { normalizeTableName } from '@/lib/normalize';
import { onTableEvent } from '@/lib/table-events';
import {
	buildFilters,
	clearedFiltersQuery,
	filtersQuery,
	parseTableQuery,
	searchQuery,
	type TableFilters,
	toSortOrder,
} from '@/lib/table-query';
import { AlertType, type ServerError } from '@/models/alert';
import type { TableProperties } from '@/models/table';
import type { ConnectionSettingsUI } from '@/models/ui-settings';
import { useConfigurationStateStore } from '@/stores/configuration-state';
import { useConnectionsStore } from '@/stores/connections';
import { useTableStateStore } from '@/stores/table-state';
import { type TableFolder, useTablesStore } from '@/stores/tables';
import { useUiSettingsStore } from '@/stores/ui-settings';

const ALL_TABLES = 'all-tables-kitten';

const route = useRoute();
const router = useRouter();
const dialog = useDialog();
const connections = useConnectionsStore();
const tables = useTablesStore();
const tableState = useTableStateStore();
const uiSettingsStore = useUiSettingsStore();
const configState = useConfigurationStateStore();

const isSaas = environment.saas;

const connectionID = computed(() => {
	const value = route.params.connectionId;
	return (Array.isArray(value) ? value[0] : value) ?? '';
});
const routeTableName = computed(() => {
	const value = route.params.tableName;
	return (Array.isArray(value) ? value[0] : value) || null;
});
/** The route watchers fire once more while this page is being left; only react while it is shown. */
const onDashboardRoute = computed(() => route.name === 'dashboard' || route.name === 'table');

const tableData = useTableData();
const selection = useRowSelection();

const tableFolders = ref<TableFolder[]>([]);
const selectedTableName = ref<string | null>(null);
const selectedTableDisplayName = ref('');
const shownTableTitles = ref(true);
const uiSettings = ref<ConnectionSettingsUI | null>(null);
const loading = ref(true);
const isServerError = ref(false);
const serverError = ref<ServerError | null>(null);
const noTablesError = ref(false);

// The query state of the open table, as setTable read it from the URL.
const filters = ref<TableFilters>({});
const comparators = ref<Record<string, string | undefined>>({});
const pageIndex = ref(0);
const pageSize = ref(30);
const sortColumn = ref<string | undefined>(undefined);
const sortOrder = ref<'ASC' | 'DESC' | undefined>(undefined);

const isConfiguring = computed(() => configState.isConfiguring(connectionID.value));
const canEditConnection = computed(() => connections.canEditConnection);
const currentConnectionIsTest = computed(() => !!connections.connection.isTestConnection);
const connectionTitle = computed(() => connections.connection?.title || 'Database');
const allTables = computed<TableProperties[]>(
	() => tableFolders.value.find((category) => category.category_id === ALL_TABLES)?.tables || [],
);

let stopRouteWatch: (() => void) | null = null;

onMounted(load);

// Another connection in the same page instance: start over, as a fresh page would.
watch(connectionID, (id, previous) => {
	if (id === previous || !onDashboardRoute.value) return;
	stopRouteWatch?.();
	stopRouteWatch = null;
	selection.clear();
	tableState.clearSelection();
	tableFolders.value = [];
	selectedTableName.value = null;
	noTablesError.value = false;
	isServerError.value = false;
	loading.value = true;
	load();
});

async function load() {
	let settings: Awaited<ReturnType<typeof uiSettingsStore.getUiSettings>> = null;
	try {
		settings = await uiSettingsStore.getUiSettings();
	} catch {
		// Shown by the store; carry on with the defaults.
	}
	uiSettings.value = settings?.connections[connectionID.value] ?? null;
	shownTableTitles.value = settings?.connections[connectionID.value]?.shownTableTitles ?? true;
	getData();
}

onBeforeUnmount(() => {
	stopRouteWatch?.();
	tableState.clearSelection();
});

onTableEvent('rowDeleted', refreshAfterChange);
onTableEvent('rowsDeleted', refreshAfterChange);
onTableEvent('imported', refreshAfterChange);
onTableEvent('actionsActivated', () => selection.clear());

function refreshAfterChange() {
	if (!selectedTableName.value || loading.value) return;
	setTable(selectedTableName.value);
	selection.clear();
}

async function getData() {
	const id = connectionID.value;
	let res: TableFolder[];
	try {
		res = await tables.fetchTablesFolders(id);
	} catch (error) {
		if (connectionID.value !== id) return;
		isServerError.value = true;
		serverError.value = {
			abstract: (isApiError(error) && error.body?.message) || (error as Error).message,
			details: (isApiError(error) && error.details) || '',
		};
		loading.value = false;
		document.title = 'Error | Rocketadmin';
		return;
	}

	// Switched to another connection while loading: that connection's own load takes over.
	if (connectionID.value !== id) return;
	tableFolders.value = res;
	const all = res.find((item) => item.category_id === ALL_TABLES)?.tables || [];
	if (all.length === 0) {
		noTablesError.value = true;
		loading.value = false;
		document.title = 'No tables | Rocketadmin';
		return;
	}

	formatTableNames();
	stopRouteWatch?.();
	stopRouteWatch = watch(routeTableName, (tableName) => onTableParam(tableName, id), { immediate: true });
}

/**
 * paramMap: open the table of the URL, or redirect to the default (or first) table. Skipped once the
 * route has moved to another connection: the tables loaded are still those of `loadedConnectionID`.
 */
function onTableParam(tableName: string | null, loadedConnectionID: string) {
	if (!onDashboardRoute.value || connectionID.value !== loadedConnectionID) return;
	if (tableName) {
		selectedTableName.value = tableName;
		setTable(tableName);
		document.title = `${selectedTableDisplayName.value} table | Rocketadmin`;
		selection.clear();
	} else {
		const target = connections.defaultDisplayTable || allTables.value[0]?.table;
		router.replace({ path: `/dashboard/${connectionID.value}/${target}`, query: route.query });
		selectedTableName.value = target ?? null;
	}
}

/** Display names and initials of every table, so all the components receive formatted tables. */
function formatTableNames() {
	tableFolders.value = tableFolders.value.map((category) => ({
		...category,
		tables: category.tables.map((tableItem) => {
			const normalizedTableName = tableItem.display_name || normalizeTableName(tableItem.table);
			const initials = normalizedTableName
				.split(' ')
				.reduce((result, word) => (word.length > 0 ? result + word.charAt(0).toUpperCase() : result), '');
			return { ...tableItem, normalizedTableName, initials: initials.slice(0, 2) };
		}),
	}));
}

function setTable(tableName: string) {
	selectedTableName.value = tableName;
	const query = parseTableQuery(route.query);
	filters.value = query.filters ?? {};
	comparators.value = query.comparators;
	pageIndex.value = query.pageIndex;
	pageSize.value = query.pageSize;
	sortColumn.value = query.sortActive;
	sortOrder.value = toSortOrder(query.sortDirection);
	getRows(query.search, query.uncached);

	const properties = allTables.value.find((table) => table.table === tableName);
	if (!properties) return;
	selectedTableDisplayName.value = properties.display_name || normalizeTableName(properties.table);
	loading.value = false;
}

function getRows(search?: string | null, uncached?: boolean) {
	tableData.fetchRows({
		connectionID: connectionID.value,
		tableName: selectedTableName.value ?? '',
		requstedPage: pageIndex.value,
		pageSize: pageSize.value,
		sortColumn: sortColumn.value,
		sortOrder: sortOrder.value,
		filters: filters.value,
		search,
		uncached,
	});
}

function tablePath() {
	return `/dashboard/${connectionID.value}/${selectedTableName.value}`;
}

/** Filters from the dialog: `{ [column]: { [comparator]: value } }`, first page, in the URL. */
function applyDialogFilters(fields: Record<string, unknown>, dialogComparators: Record<string, string | undefined>) {
	const next = buildFilters(fields, dialogComparators);
	comparators.value = dialogComparators;
	if (!next) return;
	filters.value = next;
	pageIndex.value = 0;
	router.push({ path: tablePath(), query: filtersQuery(next, pageSize.value) });
	getRows();
	track('Dashboard: filter is applied');
}

async function openTableFilters(structure: OpenFiltersPayload) {
	// From an active-filter chip the table view already ran the dialog: apply what it returned.
	if (structure.filters) {
		applyDialogFilters(structure.filters, structure.comparators ?? {});
		return;
	}
	const data: TableFiltersDialogData = {
		connectionID: connectionID.value,
		tableName: selectedTableName.value ?? '',
		displayTableName: selectedTableDisplayName.value,
		structure: { ...structure, structure: structure.structure ?? [] },
	};
	const result = readFiltersDialogResult(await dialog.open(TableFiltersDialog, { data }).afterClosed());
	if (result?.action === 'filter') {
		applyDialogFilters(result.fields, result.comparators);
	} else if (result?.action === 'reset') {
		filters.value = {};
		getRows();
		router.push({ path: tablePath() });
	}
}

function removeFilter(columnName: string) {
	filters.value = omitBy({ ...filters.value, [columnName]: undefined }, (value) => value === undefined) as TableFilters;
	selection.clear();
	pageIndex.value = 0;
	getRows();
	router.push({ path: tablePath(), query: filtersQuery(filters.value, pageSize.value) });
}

function clearAllFilters() {
	filters.value = {};
	comparators.value = {};
	pageIndex.value = 0;
	getRows();
	router.push({ path: tablePath(), query: clearedFiltersQuery(pageSize.value) });
}

function search(value: string | null) {
	filters.value = {};
	pageIndex.value = 0;
	getRows(value);
	router.push({ path: tablePath(), query: searchQuery(value, pageSize.value) });
}

/** A saved filter chosen (or cleared) in the saved filters panel. */
function applyFilter(selected: SavedFilterSelection | null) {
	filters.value = (selected?.filters as TableFilters | undefined) ?? {};
	getRows();
}

async function activateActions({ action, primaryKeys, identityFieldValues }: ActivateActionsPayload) {
	if (action.require_confirmation) {
		dialog.open(BulkActionConfirmationDialog, {
			data: {
				id: action.id,
				title: action.title,
				primaryKeys,
				identityFieldValues,
				tableDisplayName: selectedTableDisplayName.value,
			},
		});
		return;
	}
	try {
		const res = (await tables.activateActions(
			connectionID.value,
			selectedTableName.value ?? '',
			action.id ?? '',
			action.title,
			primaryKeys,
		)) as { location?: string } | null;
		if (res?.location) {
			dialog.open(ActionLinkDialog, {
				data: { href: res.location, actionName: action.title, primaryKeys: primaryKeys[0] },
			});
		}
	} catch {
		// The store has shown the error.
	}
}

function toggleSideBar() {
	track('Dashboard: toggle sidebar', { collapsed: !shownTableTitles.value });
	shownTableTitles.value = !shownTableTitles.value;
	uiSettingsStore.updateConnectionSetting(connectionID.value, 'shownTableTitles', shownTableTitles.value);
}

function onSchemaApplied() {
	setTimeout(() => {
		noTablesError.value = false;
		loading.value = true;
		getData();
	}, 1500);
}

function openIntercom() {
	window.Intercom?.('show');
}
</script>

<template>
	<PlaceholderTableView v-if="loading && !noTablesError && !isServerError" />

	<AppBanner v-if="isServerError && serverError" :type="AlertType.Error" data-testid="connection-server-error-banner">
		<div v-if="serverError.details">
			<strong>{{ serverError.abstract }}</strong>
			<p class="dashboard__error-details">{{ serverError.details }}</p>
		</div>
		<p v-else>{{ serverError.abstract }}</p>
		<template #actions>
			<UiButton v-if="canEditConnection" variant="secondary" :to="`/edit-db/${connectionID}`">
				Check database credentials
			</UiButton>
			<UiButton v-if="isSaas" variant="danger" @click="openIntercom">Chat with support</UiButton>
			<UiButton v-else variant="danger" href="https://github.com/rocket-admin/rocketadmin/issues" target="_blank">
				Report a bug
			</UiButton>
		</template>
	</AppBanner>

	<SchemaEditor
		v-if="noTablesError"
		:connection-id="connectionID"
		data-testid="no-tables-generate-schema"
		@schema-applied="onSchemaApplied"
	/>

	<div v-if="!loading && !isServerError && !noTablesError" class="dashboard">
		<div v-if="isConfiguring" class="dashboard__configuring" role="status">
			<UiIcon name="info" size="sm" class="dashboard__configuring-icon" />
			<div class="dashboard__configuring-body">
				<strong class="dashboard__configuring-title">Configuring tables</strong>
				<span class="dashboard__configuring-subtitle">
					Some tables may look incomplete while setup is running. You can adjust column types, display formats and
					filters in
					<RouterLink class="dashboard__configuring-link" :to="`/table-settings/${connectionID}/${selectedTableName}`">
						Settings
					</RouterLink>
					and
					<RouterLink class="dashboard__configuring-link" :to="`/widgets/${connectionID}/${selectedTableName}`">
						UI widgets
					</RouterLink>
					after setup finishes.
				</span>
			</div>
			<div class="dashboard__configuring-progress" aria-hidden="true">
				<div class="dashboard__configuring-progress-fill" />
			</div>
		</div>

		<div class="dashboard__layout">
			<aside
				class="dashboard__sidebar"
				:class="{ 'dashboard__sidebar--collapsed': !shownTableTitles }"
				aria-label="Tables"
			>
				<UiButton v-if="shownTableTitles" variant="ghost" size="sm" class="dashboard__toggle" @click="toggleSideBar">
					Collapse
					<template #trailing><UiIcon name="chevron_left" size="sm" /></template>
				</UiButton>
				<UiIconButton
					v-else
					icon="chevron_right"
					label="Expand sidebar"
					class="dashboard__toggle"
					@click="toggleSideBar"
				/>
				<TablesList
					:key="connectionID"
					:collapsed="!shownTableTitles"
					:connection-title="connectionTitle"
					:table-folders="tableFolders"
					:connection-i-d="connectionID"
					:selected-table="selectedTableName"
					:ui-settings="uiSettings"
					@expand-sidebar="toggleSideBar"
				/>
			</aside>

			<div class="dashboard__preview">
				<div class="dashboard__content">
					<div class="dashboard__alerts">
						<AppAlert />
						<div
							v-if="tableData.alert_settingsInfo && canEditConnection && !isConfiguring"
							class="dashboard__ai-config"
							data-testid="ai-config-alert"
						>
							<UiIcon name="auto_awesome" class="dashboard__ai-config-icon" />
							<div class="dashboard__ai-config-message">
								<strong class="dashboard__ai-config-title">New: AI Configuration</strong>
								<p class="dashboard__ai-config-text">
									Automatically configure all your tables with AI. You can adjust changes in Settings and UI widgets.
								</p>
							</div>
							<UiButton variant="ghost" :to="`/auto-configure/${connectionID}`">Configure all</UiButton>
						</div>
						<AppAlert v-if="tableData.alert_primaryKeysInfo" :alert="tableData.alert_primaryKeysInfo" />
						<AppAlert v-if="tableData.alert_widgetsWarning" :alert="tableData.alert_widgetsWarning" />
					</div>

					<AppContentLoader v-if="!selectedTableName" />
					<TableView
						v-else
						:display-name="selectedTableDisplayName"
						:active-filters="filters"
						:filter-comparators="comparators"
						:name="selectedTableName"
						:table="tableData"
						:selection="selection"
						:connection-i-d="connectionID"
						:is-test-connection="currentConnectionIsTest"
						:table-folders="tableFolders"
						@open-filters="openTableFilters"
						@remove-filter="removeFilter"
						@reset-all-filters="clearAllFilters"
						@search="search"
						@activate-actions="activateActions"
						@apply-filter="applyFilter"
					/>
				</div>
				<TableRowView v-if="tableState.selectedRow" :active-filters="filters" />
				<div
					v-if="tableState.aiPanelOpen"
					class="dashboard__ai-panel"
					:class="{ 'dashboard__ai-panel--expanded': tableState.aiPanelExpanded }"
				>
					<TableAiPanel
						:display-name="selectedTableDisplayName"
						:table-columns="tableData.dataColumns || []"
						:sidebar-expanded="shownTableTitles"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.dashboard {
	display: flex;
	flex-direction: column;
	height: calc(100vh - var(--header-height));
}

.dashboard__layout {
	display: flex;
	flex: 1;
	min-height: 0;
}

.dashboard__sidebar {
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
	width: 240px;
	overflow-x: hidden;
	overflow-y: auto;
	border-inline-end: 1px solid var(--color-line);
	background: var(--color-surface);
}

.dashboard__sidebar--collapsed {
	width: 65px;
	align-items: center;
}

.dashboard__toggle {
	align-self: flex-start;
	margin: var(--space-2) 0 0 var(--space-3);
}

.dashboard__sidebar--collapsed .dashboard__toggle {
	align-self: center;
	margin-inline-start: 0;
}

.dashboard__preview {
	position: relative;
	display: flex;
	flex: 1;
	min-width: 0;
	overflow-x: hidden;
}

/* The AI panel fills this box: a side column, or the whole table area once expanded. */
.dashboard__ai-panel {
	flex-shrink: 0;
	width: clamp(200px, 22vw, 400px);
	height: 100%;
	border-inline-start: 1px solid var(--color-line);
	background: var(--color-surface);
}

.dashboard__ai-panel--expanded {
	position: absolute;
	inset: 0;
	z-index: var(--z-sticky);
	width: auto;
}

.dashboard__content {
	flex: 1;
	min-width: 0;
	padding: var(--space-6);
	overflow-y: auto;
}

.dashboard__alerts {
	display: flex;
	flex-direction: column;
	gap: var(--space-2);
	margin: 0 0 var(--space-4);
}

.dashboard__alerts:empty {
	margin: 0;
}

.dashboard__ai-config {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	padding: var(--space-3) var(--space-4) var(--space-3) var(--space-2);
	border: 1px solid var(--color-accent);
	border-inline-start-width: 12px;
	border-radius: var(--radius-control);
	background: var(--color-paper-2);
}

.dashboard__ai-config-icon {
	flex-shrink: 0;
	color: var(--color-accent);
}

.dashboard__ai-config-message {
	display: flex;
	flex: 1;
	flex-direction: column;
	justify-content: center;
}

.dashboard__ai-config-title {
	margin-bottom: var(--space-1);
	color: var(--color-accent);
}

.dashboard__ai-config-text {
	margin: 0;
}

.dashboard__configuring {
	display: flex;
	align-items: center;
	gap: var(--space-3);
	padding: var(--space-3) var(--space-5);
	border-inline-start: 3px solid var(--color-accent);
	background: var(--color-paper-2);
	font-size: var(--text-sm);
}

.dashboard__configuring-icon {
	flex-shrink: 0;
	color: var(--color-accent);
}

.dashboard__configuring-body {
	display: flex;
	flex: 1;
	align-items: baseline;
	gap: var(--space-2);
	min-width: 0;
}

.dashboard__configuring-title {
	white-space: nowrap;
}

.dashboard__configuring-subtitle {
	color: var(--color-ink-soft);
}

.dashboard__configuring-link {
	color: var(--color-accent);
}

.dashboard__configuring-progress {
	flex-shrink: 0;
	width: 80px;
	height: 3px;
	overflow: hidden;
	border-radius: var(--radius-pill);
	background: var(--color-line);
}

.dashboard__configuring-progress-fill {
	width: 40%;
	height: 100%;
	border-radius: var(--radius-pill);
	background: var(--color-accent);
	animation: dashboard-indeterminate 1.5s ease-in-out infinite;
}

@keyframes dashboard-indeterminate {
	0% {
		transform: translateX(-100%);
	}
	100% {
		transform: translateX(350%);
	}
}

.dashboard__error-details {
	margin: var(--space-2) 0 0;
}

@media (width <= 600px) {
	.dashboard__sidebar {
		display: none;
	}

	.dashboard__ai-panel {
		position: fixed;
		inset: var(--header-height) 0 0;
		z-index: var(--z-overlay);
		width: 100vw;
		height: auto;
		border-inline-start: 0;
	}

	.dashboard__content {
		padding: var(--space-4);
	}

	.dashboard__ai-config {
		flex-wrap: wrap;
	}

	.dashboard__configuring-body {
		flex-direction: column;
		gap: var(--space-05);
	}
}
</style>
