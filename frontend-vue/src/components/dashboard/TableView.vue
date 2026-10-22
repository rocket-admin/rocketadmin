<script setup lang="ts">
// Port of dashboard/db-table-view (DbTableViewComponent): one table's page of rows with its
// toolbar — search, filters (chips for the active ones), fast filters, columns, import/export,
// table settings — the bulk actions bar for selected rows, per-row actions and the paginator.
// On phones the same controls move into bottom sheets (table switcher, sort, columns,
// import/export), with pull-to-refresh and an "Add row" FAB.
//
// The rows and everything derived from them are the `table` prop (useTableData, the Angular
// TablesDataSource), owned by DashboardView like the `selection`. Sort and page live here and are
// written to the URL on every change, exactly as the Angular view navigated:
// filters / saved_filter / dynamic_column / sort_active / sort_direction / page_index / page_size.
// The pure helpers are in lib/table-view.ts.
import JSON5 from 'json5';
import { type Component, computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ForeignKeyDisplay from '@/components/fields/table-display/ForeignKeyDisplay.vue';
import PlaceholderTableData from '@/components/skeletons/PlaceholderTableData.vue';
import {
	type PageEvent,
	type TableColumn,
	type TableRowKey,
	type TableSort,
	type TableSortDirection,
	UiButton,
	UiDivider,
	UiIcon,
	UiIconButton,
	UiInput,
	UiMenu,
	UiMenuItem,
	UiPaginator,
	UiTable,
	vTooltip,
} from '@/components/ui';
import { useDialog } from '@/composables/useDialog';
import { useNotify } from '@/composables/useNotify';
import type { RowSelection } from '@/composables/useRowSelection';
import type { TableData, TableDataRow } from '@/composables/useTableData';
import { tableDisplayTypes, UIwidgets } from '@/consts/table-display-types';
import { formatFieldValue } from '@/lib/format-field-value';
import { getTableTypes } from '@/lib/setup-table-row-structure';
import { queryValue, sortPageQuery, type TableFilters, toSortOrder } from '@/lib/table-query';
import {
	buildSelectionCsv,
	downloadCsv,
	getFilterLabel,
	getFiltersCount,
	getForeignKeyCellValue,
	isForeignKeySelected as isForeignKeySelectedFor,
	isRowSelected as isRowSelectedFor,
	moveColumn,
	type SelectedRowType,
	type TableCategoryView,
	tableSwitcherGroups,
	visibleFirstTitles,
} from '@/lib/table-view';
import { type RelatedRecords, type TableForeignKey, TableOrdering, type Widget } from '@/models/table';
import { useCedarPermissionsStore } from '@/stores/cedar-permissions';
import { useConnectionsStore } from '@/stores/connections';
import { useTableRowStore } from '@/stores/table-row';
import { useTableStateStore } from '@/stores/table-state';
import { useTablesStore } from '@/stores/tables';
import { track } from './analytics';
import { stashBackUrl, stashBackUrlFilters } from './backUrl';
import ColumnsList from './ColumnsList.vue';
import SavedFiltersPanel from './SavedFiltersPanel.vue';
import TableExportDialog, { type TableExportDialogData } from './TableExportDialog.vue';
import TableFiltersDialog, { type TableFiltersDialogData } from './TableFiltersDialog.vue';
import TableImportDialog, { type TableImportDialogData } from './TableImportDialog.vue';
import TableSheet from './TableSheet.vue';
import {
	type ActionToActivate,
	type ActivateActionsPayload,
	type OpenFiltersPayload,
	readFiltersDialogResult,
	type SavedFilterItem,
	type SavedFilterSelection,
	type SavedFiltersPanelApi,
} from './types';

const props = withDefaults(
	defineProps<{
		name: string;
		displayName?: string;
		connectionID: string;
		isTestConnection?: boolean;
		activeFilters?: TableFilters | null;
		filterComparators?: Record<string, string | undefined> | null;
		selection: RowSelection;
		tableFolders?: TableCategoryView[];
		table: TableData;
	}>(),
	{ displayName: '', isTestConnection: false, activeFilters: null, filterComparators: null, tableFolders: () => [] },
);

const emit = defineEmits<{
	openFilters: [payload: OpenFiltersPayload];
	search: [value: string | null];
	removeFilter: [column: string];
	resetAllFilters: [];
	activateActions: [payload: ActivateActionsPayload];
	applyFilter: [selection: SavedFilterSelection | null];
}>();

type WidgetMap = Record<string, Component | string | undefined>;

/** Served from /assets, not bundled (a literal `src` would be resolved as an import). */
const AI_ROCKET_ICON = '/assets/icons/ai-rocket.svg';

const route = useRoute();
const router = useRouter();
const dialog = useDialog();
const notify = useNotify();
const tableState = useTableStateStore();
const tables = useTablesStore();
const tableRow = useTableRowStore();
const connections = useConnectionsStore();
const permissions = useCedarPermissionsStore();

const tableData = computed(() => props.table);

// --- Permissions ------------------------------------------------------------------------------
const resourceId = computed(() => `${props.connectionID}/${props.name}`);
const canEditRow = computed(() => !!permissions.canI('table:edit', 'Table', resourceId.value).value);
const canAddRow = computed(() => !!permissions.canI('table:add', 'Table', resourceId.value).value);
const canDeleteRow = computed(() => !!permissions.canI('table:delete', 'Table', resourceId.value).value);
const canEditConnection = computed(() => connections.canEditConnection);

/** Row actions shown: the table's custom actions plus edit / duplicate / delete as permitted. */
const actionsCount = computed(() => {
	const defaults =
		(canEditRow.value ? 1 : 0) + (canAddRow.value ? 1 : 0) + (canDeleteRow.value && tableData.value.canDelete ? 1 : 0);
	return (tableData.value.tableActions?.length || 0) + defaults;
});
const hasActions = computed(() => actionsCount.value > 0);
const selectable = computed(() => hasActions.value && tableData.value.keyAttributes.length > 0);

// --- Search, filters ----------------------------------------------------------------------------
const searchString = ref<string | null>(queryValue(route.query, 'search') ?? null);
const staticSearchString = ref<string | null>(null);
const hasSavedFilterActive = ref(false);

watch(
	() => route.query.saved_filter,
	() => {
		hasSavedFilterActive.value = !!queryValue(route.query, 'saved_filter');
		if (hasSavedFilterActive.value) searchString.value = '';
	},
	{ immediate: true },
);

const filtersCount = computed(() => getFiltersCount(props.activeFilters, hasSavedFilterActive.value));
const activeFilterEntries = computed(() => Object.entries(props.activeFilters ?? {}));

function filtersStructure() {
	return {
		structure: tableData.value.structure,
		foreignKeysList: tableData.value.foreignKeysList,
		foreignKeys: tableData.value.foreignKeys,
		widgets: tableData.value.widgets,
	};
}

function handleOpenFilters() {
	track('Dashboard: filters is clicked');
	emit('openFilters', filtersStructure());
	searchString.value = '';
}

function handleSearch() {
	track('Dashboard: search is applied');
	searchString.value = (searchString.value ?? '').trim();
	staticSearchString.value = searchString.value;
	emit('search', searchString.value);
}

function clearSearch() {
	searchString.value = null;
	emit('search', searchString.value);
}

async function handleActiveFilterClick(filterKey: string) {
	const data: TableFiltersDialogData = {
		connectionID: props.connectionID,
		tableName: props.name,
		displayTableName: props.displayName,
		structure: {
			...filtersStructure(),
			structure: tableData.value.structure ?? [],
			widgets: tableData.value.widgets || {},
		},
		autofocusField: filterKey,
	};
	const result = readFiltersDialogResult(await dialog.open(TableFiltersDialog, { data }).afterClosed());
	if (result?.action === 'filter') {
		emit('openFilters', { ...filtersStructure(), filters: result.fields, comparators: result.comparators });
	}
}

// --- Saved ("fast") filters ---------------------------------------------------------------------
const savedFiltersPanel = ref<SavedFiltersPanelApi | null>(null);
const savedFilterData = computed<SavedFilterItem[]>(() => savedFiltersPanel.value?.savedFilterData ?? []);

function handleOpenCreateQuickFilter() {
	track('Saved filters: create new filter is clicked');
	savedFiltersPanel.value?.handleOpenSavedFiltersDialog();
}

function onFilterSelected(selection: SavedFilterSelection | null) {
	emit('applyFilter', selection);
}

// --- Sort and paging (URL-synced) ---------------------------------------------------------------
const sort = ref<TableSort>({ active: '', direction: '' });
const defaultSort = ref<{ column: string; direction: 'asc' | 'desc' } | null>(null);
let sortInitialized = false;
const pageIndex = ref(tableData.value.pageIndex);
const pageSize = ref(tableData.value.pageSize);

watch(
	() => [tableData.value.pageIndex, tableData.value.pageSize] as const,
	([index, size]) => {
		pageIndex.value = index;
		pageSize.value = size;
	},
);

// Once rows have loaded (first time per table): the URL's sort, else the table's default sort.
watch(
	() => tableData.value.loading,
	(loading) => {
		if (loading || tableData.value.defaultSort === undefined || sortInitialized) return;
		sortInitialized = true;
		defaultSort.value = tableData.value.defaultSort;
		const urlSortActive = queryValue(route.query, 'sort_active');
		const urlSortDirection = queryValue(route.query, 'sort_direction');
		if (urlSortActive && urlSortDirection) {
			sort.value = { active: urlSortActive, direction: urlSortDirection.toLowerCase() as TableSortDirection };
		} else if (defaultSort.value) {
			sort.value = { active: defaultSort.value.column, direction: defaultSort.value.direction };
		}
	},
	{ immediate: true },
);

// Another table: back to no sort, re-initialised from that table's default once it loads.
watch(
	() => props.name,
	() => {
		sort.value = { active: '', direction: '' };
		defaultSort.value = null;
		sortInitialized = false;
	},
);

/** sortChange / paginator.page: write the URL, then load the page. */
function onStateChange() {
	router.push({
		path: `/dashboard/${props.connectionID}/${props.name}`,
		query: sortPageQuery({
			filters: props.activeFilters ?? undefined,
			savedFilter: queryValue(route.query, 'saved_filter'),
			dynamicColumn: queryValue(route.query, 'dynamic_column'),
			sortActive: sort.value.active,
			sortDirection: sort.value.direction,
			pageIndex: pageIndex.value,
			pageSize: pageSize.value,
		}),
	});
	loadRowsPage();
}

function onPage(event: PageEvent) {
	pageIndex.value = event.pageIndex;
	pageSize.value = event.pageSize;
	onStateChange();
}

function loadRowsPage() {
	tableData.value.fetchRows({
		connectionID: props.connectionID,
		tableName: props.name,
		requstedPage: pageIndex.value,
		pageSize: pageSize.value,
		sortColumn: sort.value.active,
		sortOrder: toSortOrder(sort.value.direction),
		filters: props.activeFilters ?? undefined,
		search: searchString.value,
		isTablePageSwitched: true,
	});
}

function isSortable(column: string): boolean {
	return tableData.value.sortByColumns.includes(column) || !tableData.value.sortByColumns.length;
}

const sortableDataColumns = computed(() => tableData.value.displayedDataColumns.filter((column) => isSortable(column)));

/** Picking the active sort again clears it (and the default, if that column was it). */
function applySort(column: string, direction: 'asc' | 'desc') {
	if (sort.value.active === column && sort.value.direction === direction) {
		if (defaultSort.value?.column === column) defaultSort.value = null;
		sort.value = { active: '', direction: '' };
	} else {
		sort.value = { active: column, direction };
	}
	onStateChange();
}

function isDefaultSort(column: string): boolean {
	return defaultSort.value?.column === column;
}

function canToggleDefaultSort(column: string): boolean {
	return (sort.value.active === column && !!sort.value.direction) || isDefaultSort(column);
}

function toggleDefaultSort(column: string) {
	if (isDefaultSort(column)) {
		defaultSort.value = null;
		tables
			.updatePersonalTableViewSettings(props.connectionID, props.name, {
				ordering: null as unknown as undefined,
				ordering_field: null as unknown as undefined,
			})
			.catch(() => {});
	} else {
		const direction = sort.value.active === column ? sort.value.direction : 'asc';
		defaultSort.value = { column, direction: direction as 'asc' | 'desc' };
		tables
			.updatePersonalTableViewSettings(props.connectionID, props.name, {
				ordering: sort.value.direction === 'asc' ? TableOrdering.Ascending : TableOrdering.Descending,
				ordering_field: column,
			})
			.catch(() => {});
	}
}

function sortIcon(column: string): string {
	if (sort.value.active !== column || !sort.value.direction) return 'unfold_more';
	return sort.value.direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
}

// --- Columns ------------------------------------------------------------------------------------
const columnsOpen = ref(false);
const columnsRoot = ref<HTMLElement | null>(null);

const tableColumns = computed<TableColumn<TableDataRow>[]>(() =>
	tableData.value.displayedDataColumns.map((column) => {
		const label = tableData.value.dataNormalizedColumns[column] ?? column;
		const arrow =
			sort.value.active === column && sort.value.direction ? (sort.value.direction === 'asc' ? ' ↑' : ' ↓') : '';
		return { key: column, label: `${label}${arrow}` };
	}),
);

function onColumnVisibilityChange() {
	tableData.value.changeColumnList();
	tables
		.updatePersonalTableViewSettings(props.connectionID, props.name, {
			columns_view: tableData.value.displayedDataColumns,
			list_fields: visibleFirstTitles(tableData.value.columns),
		})
		.catch(() => {});
}

function onColumnsReorder(previousIndex: number, currentIndex: number) {
	const data = tableData.value;
	if (!moveColumn(data.columns, previousIndex, currentIndex)) return;
	data.dataColumns = data.columns.map((column) => column.title);
	const newDisplayedOrder = data.columns.filter((column) => column.selected).map((column) => column.title);
	data.displayedDataColumns = newDisplayedOrder;
	data.displayedColumns = data.keyAttributes?.length
		? ['select', ...newDisplayedOrder, 'actions']
		: [...newDisplayedOrder];
	tables
		.updatePersonalTableViewSettings(props.connectionID, props.name, {
			list_fields: visibleFirstTitles(data.columns),
		})
		.catch(() => {});
}

function toggleColumns() {
	track('Dashboard: columns multiselect is clicked');
	columnsOpen.value = !columnsOpen.value;
}

function onDocumentClick(event: MouseEvent) {
	if (columnsOpen.value && columnsRoot.value && !columnsRoot.value.contains(event.target as Node)) {
		columnsOpen.value = false;
	}
}

function onDocumentKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') columnsOpen.value = false;
}

// --- Cells --------------------------------------------------------------------------------------
const displayCellComponents = computed<WidgetMap>(
	() => (tableDisplayTypes as Record<string, WidgetMap>)[connections.connection.type] ?? {},
);
const widgetComponents = UIwidgets as WidgetMap;

function isForeignKey(column: string): boolean {
	return tableData.value.foreignKeysList.includes(column);
}

function isWidget(column: string): boolean {
	return !!tableData.value.widgetsList?.includes(column);
}

function widgetComponent(column: string): Component | null {
	if (!isWidget(column)) return null;
	const type = tableData.value.widgets[column]?.widget_type;
	return (type && (widgetComponents[type] as Component | undefined)) || null;
}

function typeComponent(column: string): Component | null {
	const type = tableData.value.tableTypes[column];
	return (type && (displayCellComponents.value[type] as Component | undefined)) || null;
}

function cellOf(row: TableDataRow, column: string): Record<string, unknown> | null {
	return (row[column] as Record<string, unknown> | null | undefined) ?? null;
}

function showCopyNotification(message: string) {
	notify.success(message);
}

// --- Rows: selection, side panel ---------------------------------------------------------------
const selectedRowType = ref<SelectedRowType>('record');

function rowKey(row: TableDataRow, index: number): TableRowKey {
	return tableData.value.keyAttributes.length ? JSON.stringify(tableData.value.getQueryParams(row)) : index;
}

function lookupRow(key: TableRowKey): TableDataRow | undefined {
	return tableData.value.rows.find((row, index) => rowKey(row, index) === key);
}

function onSelected(keys: TableRowKey[]) {
	props.selection.setKeys(keys, lookupRow);
}

const isAllSelected = computed(() => tableData.value.rows.length === props.selection.keys.length);

function toggleAllRows() {
	if (isAllSelected.value) {
		props.selection.clear();
	} else {
		props.selection.select(tableData.value.rows.map((row, index) => ({ key: rowKey(row, index), row })));
	}
}

function isRowSelected(row: TableDataRow): boolean {
	return isRowSelectedFor(tableState.selectedRow, selectedRowType.value, tableData.value.getQueryParams(row));
}

function rowClass(row: TableDataRow) {
	return { 'table-view__row--open': isRowSelected(row) };
}

function isForeignKeySelected(row: TableDataRow, column: string): boolean {
	const foreignKey = tableData.value.foreignKeys[column];
	if (!foreignKey) return false;
	return isForeignKeySelectedFor(tableState.selectedRow, selectedRowType.value, cellOf(row, column), foreignKey);
}

function foreignKeyValue(row: TableDataRow, column: string): string | number | null {
	const foreignKey = tableData.value.foreignKeys[column];
	if (!foreignKey) return null;
	return getForeignKeyCellValue(foreignKey, cellOf(row, column)) as string | number | null;
}

function onForeignKeyClick(row: TableDataRow, column: string) {
	const foreignKey = tableData.value.foreignKeys[column];
	if (foreignKey) handleForeignKeyView(foreignKey, cellOf(row, column));
}

function handleViewRow(row: TableDataRow) {
	selectedRowType.value = 'record';
	tableState.selectRow({
		connectionID: props.connectionID,
		tableName: props.name,
		record: row,
		columnsOrder: tableData.value.dataColumns,
		primaryKeys: tableData.value.getQueryParams(row),
		foreignKeys: tableData.value.foreignKeys,
		foreignKeysList: tableData.value.foreignKeysList,
		widgets: tableData.value.widgets,
		widgetsList: tableData.value.widgetsList,
		fieldsTypes: tableData.value.tableTypes,
		relatedRecords: tableData.value.relatedRecords || null,
		link: `/dashboard/${props.connectionID}/${props.name}/entry`,
	});
}

interface ForeignRowResponse {
	row: Record<string, unknown>;
	structure: Parameters<typeof getTableTypes>[0];
	foreignKeys: TableForeignKey[];
	table_widgets: Widget[];
	list_fields: string[];
	referenced_table_names_and_columns: RelatedRecords[];
}

async function handleForeignKeyView(foreignKey: TableForeignKey, cell: Record<string, unknown> | null) {
	selectedRowType.value = 'foreignKey';
	tableState.selectRow({
		connectionID: null,
		tableName: null,
		record: null,
		columnsOrder: null,
		primaryKeys: null,
		foreignKeys: null,
		foreignKeysList: null,
		widgets: null,
		widgetsList: null,
		fieldsTypes: null,
		relatedRecords: null,
		link: null,
	});

	let res: ForeignRowResponse;
	try {
		res = await tableRow.fetchTableRow<ForeignRowResponse>(props.connectionID, foreignKey.referenced_table_name, {
			[foreignKey.referenced_column_name]: cell?.[foreignKey.referenced_column_name] as string,
		});
	} catch {
		return;
	}
	const foreignKeysList = res.foreignKeys.map((key) => key.column_name);
	const fieldsTypes: Record<string, string> = getTableTypes(res.structure, foreignKeysList);
	const formattedRecord = Object.fromEntries(
		Object.entries(res.row).map(([key, value]) => [key, formatFieldValue(value, fieldsTypes[key] ?? '')]),
	);
	const widgets = Object.assign(
		{},
		...res.table_widgets.map((widget) => {
			let parsedParams: Record<string, unknown>;
			try {
				parsedParams = JSON5.parse(widget.widget_params);
			} catch {
				parsedParams = {};
			}
			return { [widget.field_name]: { ...widget, widget_params: parsedParams } };
		}),
	);

	tableState.selectRow({
		connectionID: props.connectionID,
		tableName: foreignKey.referenced_table_name,
		record: formattedRecord,
		columnsOrder: res.list_fields,
		primaryKeys: { [foreignKey.referenced_column_name]: res.row[foreignKey.referenced_column_name] },
		foreignKeys: Object.assign({}, ...res.foreignKeys.map((key) => ({ [key.column_name]: key }))),
		foreignKeysList,
		widgets,
		widgetsList: res.table_widgets.map((widget) => widget.field_name),
		fieldsTypes,
		relatedRecords: res.referenced_table_names_and_columns[0] ?? null,
		link: `/dashboard/${props.connectionID}/${foreignKey.referenced_table_name}/entry`,
	});
}

function handleViewAIpanel() {
	track('Dashboard: AI is clicked');
	tableState.handleViewAIpanel();
}

// --- Actions ------------------------------------------------------------------------------------
function identityOf(row: TableDataRow) {
	return tableData.value.identityColumn ? { identityFieldValues: [row[tableData.value.identityColumn]] } : null;
}

function handleAction(action: ActionToActivate, row: TableDataRow) {
	emit('activateActions', { action, primaryKeys: [tableData.value.getQueryParams(row)], ...identityOf(row) });
}

function getIdentityFieldsValues(): unknown[] | null {
	const identityColumn = tableData.value.identityColumn;
	if (identityColumn) return props.selection.selected.map((row) => row[identityColumn]);
	return null;
}

function handleActions(action: ActionToActivate) {
	emit('activateActions', {
		action,
		primaryKeys: props.selection.selected.map((row) => tableData.value.getQueryParams(row)),
		identityFieldValues: getIdentityFieldsValues(),
	});
}

function handleDeleteRow(row: TableDataRow) {
	track('Dashboard: delete row is clicked');
	stashBackUrlFilters(props.activeFilters);
	emit('activateActions', {
		action: { title: 'Delete row', type: 'multiple', require_confirmation: true },
		primaryKeys: [tableData.value.getQueryParams(row)],
		...identityOf(row),
	});
}

function stashUrlParams() {
	stashBackUrl(route.query, props.activeFilters);
}

function entryLink(query?: Record<string, unknown>) {
	return { path: `/dashboard/${props.connectionID}/${props.name}/entry`, query: query as Record<string, string> };
}

function onAddRowClick() {
	stashUrlParams();
	track('Dashboard: add row is clicked');
}

function exportData() {
	if (!props.selection.selected.length) {
		notify.error('No rows selected for export');
		return;
	}
	downloadCsv(
		buildSelectionCsv(
			props.selection.selected,
			tableData.value.displayedDataColumns,
			tableData.value.foreignKeys,
			tableData.value.foreignKeysList,
		),
	);
}

function handleOpenExportDialog() {
	track('Dashboard: export is clicked');
	const data: TableExportDialogData = {
		connectionID: props.connectionID,
		tableName: props.name,
		sortColumn: sort.value.active,
		sortOrder: sort.value.direction.toUpperCase(),
		filters: props.activeFilters ?? undefined,
		search: searchString.value ?? undefined,
	};
	dialog.open(TableExportDialog, { data });
}

function handleOpenImportDialog() {
	track('Dashboard: import is clicked');
	const data: TableImportDialogData = {
		connectionID: props.connectionID,
		tableName: props.name,
		isTestConnection: props.isTestConnection,
	};
	dialog.open(TableImportDialog, { data });
}

// --- Mobile: sheets, table switcher, pull to refresh --------------------------------------------
const isMobileView = () => typeof window !== 'undefined' && window.innerWidth <= 600;

const tableSwitcherOpen = ref(false);
const tableSwitcherSearch = ref('');
const tableSwitcherInput = ref<HTMLInputElement | null>(null);
const collapsedFolders = ref(new Set<string>());
const sortSheetOpen = ref(false);
const sortExpandedColumn = ref<string | null>(null);
const columnsSheetOpen = ref(false);
const transferSheetOpen = ref(false);

const switcher = computed(() => tableSwitcherGroups(props.tableFolders, tableSwitcherSearch.value));

function openTableSwitcher() {
	tableSwitcherOpen.value = true;
	setTimeout(() => tableSwitcherInput.value?.focus(), 50);
}

function closeTableSwitcher() {
	tableSwitcherOpen.value = false;
	tableSwitcherSearch.value = '';
}

function toggleFolderCollapse(folderId: string) {
	const next = new Set(collapsedFolders.value);
	if (next.has(folderId)) next.delete(folderId);
	else next.add(folderId);
	collapsedFolders.value = next;
}

function isFolderCollapsed(folderId: string): boolean {
	if (tableSwitcherSearch.value.trim()) return false;
	return collapsedFolders.value.has(folderId);
}

function switchTable(tableName: string) {
	if (tableName && tableName !== props.name) {
		router.push({ path: `/dashboard/${props.connectionID}/${tableName}`, query: { page_index: '0', page_size: '30' } });
	}
}

function switchTableFromSheet(tableName: string) {
	closeTableSwitcher();
	switchTable(tableName);
}

function closeSortSheet() {
	sortSheetOpen.value = false;
	sortExpandedColumn.value = null;
}

function toggleSortColumn(column: string) {
	sortExpandedColumn.value = sortExpandedColumn.value === column ? null : column;
}

const PULL_THRESHOLD = 70;
const pullDistance = ref(0);
const pullRefreshing = ref(false);
let pullStartY = 0;
let pullTracking = false;

function onPullTouchStart(event: TouchEvent) {
	if (!isMobileView() || pullRefreshing.value) return;
	const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
	if (scrollTop > 0) return;
	pullStartY = event.touches[0]?.clientY ?? 0;
	pullTracking = true;
}

function onPullTouchMove(event: TouchEvent) {
	if (!pullTracking || pullRefreshing.value) return;
	const delta = (event.touches[0]?.clientY ?? pullStartY) - pullStartY;
	pullDistance.value = delta <= 0 ? 0 : Math.min(delta * 0.5, PULL_THRESHOLD + 20);
}

function onPullTouchEnd() {
	if (!pullTracking) return;
	pullTracking = false;
	if (pullDistance.value >= PULL_THRESHOLD) {
		pullRefreshing.value = true;
		pullDistance.value = PULL_THRESHOLD;
		loadRowsPage();
		setTimeout(() => {
			pullRefreshing.value = false;
			pullDistance.value = 0;
		}, 800);
	} else {
		pullDistance.value = 0;
	}
}

onMounted(() => {
	// On a phone, never restore an open AI panel: land on the table, not the chat.
	if (isMobileView()) tableState.closeAIpanel();
	document.addEventListener('click', onDocumentClick);
	document.addEventListener('keydown', onDocumentKeydown);
});

onBeforeUnmount(() => {
	document.removeEventListener('click', onDocumentClick);
	document.removeEventListener('keydown', onDocumentKeydown);
});

defineExpose({ loadRowsPage, searchString, sort });
</script>

<template>
	<div
		class="table-view"
		@touchstart.passive="onPullTouchStart"
		@touchmove.passive="onPullTouchMove"
		@touchend="onPullTouchEnd"
	>
		<div
			class="table-view__pull"
			:class="{ 'table-view__pull--active': pullDistance > 0 || pullRefreshing }"
			:style="{ height: `${pullRefreshing ? 44 : pullDistance}px` }"
			aria-hidden="true"
		>
			<UiIcon
				name="refresh"
				class="table-view__pull-icon"
				:class="{ 'table-view__pull-icon--spinning': pullRefreshing }"
				:style="pullRefreshing ? undefined : { transform: `rotate(${pullDistance * 3}deg)` }"
			/>
		</div>

		<div class="table-view__header">
			<div class="table-view__title">
				<h2 class="table-view__name">{{ displayName }}</h2>

				<button type="button" class="table-view__switcher" @click="openTableSwitcher">
					<span class="table-view__switcher-name">{{ displayName }}</span>
					<UiIcon name="arrow_drop_down" />
				</button>

				<UiIconButton icon="refresh" label="Refresh" class="table-view__refresh" @click="loadRowsPage" />

				<button
					v-tooltip="'AI assistant'"
					type="button"
					class="table-view__ai-icon-button table-view__mobile-only"
					aria-label="AI assistant"
					@click="handleViewAIpanel"
				>
					<img :src="AI_ROCKET_ICON" alt="" class="table-view__ai-icon">
				</button>
			</div>

			<!-- Bulk actions for the selected rows -->
			<div v-if="selection.keys.length" class="table-view__bulk-actions" data-testid="table-bulk-actions">
				<UiButton
					v-if="!tableData.isEmptyTable"
					variant="ghost"
					class="table-view__select-all"
					@click="toggleAllRows"
				>
					<template #leading>
						<UiIcon :name="isAllSelected ? 'check_box' : 'check_box_outline_blank'" size="sm" />
					</template>
					{{ isAllSelected ? 'Deselect all' : 'Select all' }}
				</UiButton>
				<UiButton
					v-for="action in tableData.tableBulkActions"
					:key="action.id ?? action.title"
					variant="ghost"
					@click="handleActions(action)"
				>
					{{ action.title }}
				</UiButton>
				<UiButton v-if="tableData.isExportAllowed" variant="ghost" @click="exportData">Export to CSV</UiButton>
				<UiButton
					v-if="canDeleteRow && tableData.canDelete"
					variant="ghost"
					@click="handleActions({ title: 'Delete rows', type: 'multiple', require_confirmation: true })"
				>
					Delete
				</UiButton>
			</div>

			<!-- General actions -->
			<div v-else class="table-view__actions-bar">
				<div class="table-view__search-row">
					<form
						class="table-view__search"
						:class="{ 'table-view__search--filled': searchString }"
						role="search"
						@submit.prevent="handleSearch"
					>
						<UiIcon name="search" size="sm" class="table-view__search-icon" />
						<UiInput
							v-model="searchString"
							name="search"
							placeholder="Search"
							aria-label="Search"
							class="table-view__search-input"
						/>
						<UiIconButton
							v-if="searchString"
							icon="close"
							label="Clear search"
							size="sm"
							@click="clearSearch"
						/>
					</form>
					<div class="table-view__search-buttons">
						<UiButton
							v-if="tableData.structure"
							variant="secondary"
							size="sm"
							class="table-view__mobile-only"
							:class="{ 'table-view__action--active': filtersCount }"
							@click="handleOpenFilters"
						>
							<template #leading><UiIcon name="filter_list" size="sm" /></template>
							Filter
						</UiButton>
						<template v-if="canEditConnection && tableData.structure">
							<span class="table-view__divider table-view__mobile-only" aria-hidden="true" />
							<UiButton
								v-if="!savedFilterData.length"
								variant="secondary"
								size="sm"
								class="table-view__mobile-only"
								@click="handleOpenCreateQuickFilter"
							>
								<template #leading><UiIcon name="add" size="sm" /></template>
								Create fast filter
							</UiButton>
						</template>
						<div v-if="savedFilterData.length" class="table-view__quick-chips table-view__mobile-only">
							<UiIconButton
								v-if="canEditConnection"
								icon="add"
								label="Create new fast filter"
								size="sm"
								@click="handleOpenCreateQuickFilter"
							/>
							<div
								v-for="savedFilter in savedFilterData"
								:key="savedFilter.id"
								class="table-view__quick-chip"
								:class="{ 'table-view__quick-chip--active': savedFiltersPanel?.selectedFilterSetId === savedFilter.id }"
							>
								<button
									type="button"
									class="table-view__quick-chip-label"
									@click="savedFiltersPanel?.selectFiltersSet?.(savedFilter.id)"
								>
									{{ savedFilter.name }}
								</button>
								<UiMenu v-if="canEditConnection" align="end" :label="`${savedFilter.name} options`">
									<template #trigger="{ triggerProps }">
										<UiIconButton
											v-bind="triggerProps"
											icon="more_vert"
											:label="`${savedFilter.name} options`"
											size="sm"
										/>
									</template>
									<UiMenuItem icon="create" @select="savedFiltersPanel?.handleEditFilter?.(savedFilter)">Edit</UiMenuItem>
									<UiMenuItem icon="delete" @select="savedFiltersPanel?.handleDeleteFilter?.(savedFilter)">
										Delete
									</UiMenuItem>
								</UiMenu>
							</div>
						</div>
					</div>
				</div>

				<div class="table-view__actions">
					<UiButton variant="ghost" class="table-view__ai-insights" @click="handleViewAIpanel">
						<template #leading><img :src="AI_ROCKET_ICON" alt="" class="table-view__ai-icon"></template>
						<span class="table-view__action-label">AI insights</span>
					</UiButton>

					<UiButton
						v-if="canAddRow && (!tableData.isEmptyTable || searchString || filtersCount)"
						variant="ghost"
						class="table-view__desktop-only"
						:to="entryLink()"
						data-testid="table-add-record-link"
						@click="onAddRowClick"
					>
						<template #leading><UiIcon name="add" size="sm" /></template>
						<span class="table-view__action-label">Add row</span>
					</UiButton>

					<UiButton
						v-if="tableData.structure"
						variant="ghost"
						class="table-view__desktop-only"
						:class="{ 'table-view__action--active': filtersCount }"
						data-testid="table-filter-button"
						@click="handleOpenFilters"
					>
						<template #leading><UiIcon name="filter_list" size="sm" /></template>
						<span class="table-view__action-label">Filter</span>
					</UiButton>

					<div
						v-if="tableData.displayedColumns && tableData.columns.length"
						ref="columnsRoot"
						class="table-view__columns table-view__desktop-only"
					>
						<UiButton variant="ghost" :aria-expanded="columnsOpen" aria-controls="table-view-columns" @click="toggleColumns">
							<template #leading><UiIcon name="view_week" size="sm" /></template>
							<span class="table-view__action-label">Columns</span>
							<span class="table-view__columns-count">
								({{ tableData.displayedDataColumns.length }} / {{ tableData.columns.length }})
							</span>
						</UiButton>
						<div v-if="columnsOpen" id="table-view-columns" class="table-view__columns-panel">
							<ColumnsList
								:columns="tableData.columns"
								:displayed-count="tableData.displayedDataColumns.length"
								@visibility-change="onColumnVisibilityChange"
								@reorder="onColumnsReorder"
							/>
						</div>
					</div>

					<UiMenu
						v-if="canEditConnection && (tableData.isImportAllowed || tableData.isExportAllowed)"
						align="end"
						label="Import / Export"
					>
						<template #trigger="{ triggerProps }">
							<UiIconButton
								v-bind="triggerProps"
								icon="swap_vert"
								label="Import / Export"
								class="table-view__desktop-only"
								@click="track('Dashboard: settings dropdown is clicked')"
							/>
						</template>
						<UiMenuItem v-if="tableData.isImportAllowed" @select="handleOpenImportDialog">Import</UiMenuItem>
						<UiMenuItem v-if="tableData.isExportAllowed" @select="handleOpenExportDialog">Export</UiMenuItem>
					</UiMenu>

					<UiMenu v-if="canEditConnection" align="end" label="Table settings">
						<template #trigger="{ triggerProps }">
							<UiIconButton
								v-bind="triggerProps"
								icon="settings"
								label="Table settings"
								@click="track('Dashboard: settings dropdown is clicked')"
							/>
						</template>
						<UiMenuItem
							:to="`/dashboard/${connectionID}/${name}/widgets`"
							:class="{ 'table-view__action--active': tableData.widgetsCount }"
							@select="track('Dashboard: widgets is clicked')"
						>
							UI Widgets
						</UiMenuItem>
						<UiMenuItem
							:to="`/dashboard/${connectionID}/${name}/actions`"
							:disabled="!tableData.keyAttributes?.length"
							:description="!tableData.keyAttributes?.length ? 'Primary keys are required.' : undefined"
							@select="track('Dashboard: actions is clicked')"
						>
							Automations
						</UiMenuItem>
						<UiMenuItem :to="`/dashboard/${connectionID}/${name}/settings`" @select="track('Dashboard: settings is clicked')">
							Settings
						</UiMenuItem>
						<template v-if="tableData.isImportAllowed || tableData.isExportAllowed">
							<UiDivider class="table-view__mobile-only" />
							<UiMenuItem
								v-if="tableData.isImportAllowed"
								icon="upload"
								class="table-view__mobile-only"
								@select="handleOpenImportDialog"
							>
								Import
							</UiMenuItem>
							<UiMenuItem
								v-if="tableData.isExportAllowed"
								icon="download"
								class="table-view__mobile-only"
								@select="handleOpenExportDialog"
							>
								Export
							</UiMenuItem>
						</template>
					</UiMenu>
				</div>
			</div>
		</div>

		<UiButton
			v-if="canAddRow"
			class="table-view__fab"
			:to="entryLink()"
			data-testid="table-add-record-fab"
			@click="onAddRowClick"
		>
			<template #leading><UiIcon name="add" size="sm" /></template>
			Add row
		</UiButton>

		<div v-if="filtersCount !== 0 && !hasSavedFilterActive" class="table-view__active-filters">
			<span
				v-for="[key, value] in activeFilterEntries"
				:key="key"
				class="table-view__filter-chip ph-no-capture"
				data-testid="active-filter-chip"
			>
				<button type="button" class="table-view__filter-chip-label" @click="handleActiveFilterClick(key)">
					{{ getFilterLabel(key, value) }}
				</button>
				<UiIconButton icon="cancel" label="Remove filter" size="sm" @click="emit('removeFilter', key)" />
			</span>
		</div>

		<div class="table-view__saved-filters-row">
			<div class="table-view__mobile-actions">
				<UiIconButton
					v-if="tableData.displayedColumns && tableData.columns.length"
					icon="view_week"
					label="Columns"
					@click="columnsSheetOpen = true"
				/>
				<UiButton
					v-if="tableData.displayedDataColumns?.length"
					variant="ghost"
					:class="{ 'table-view__action--active': sort.active && sort.direction }"
					@click="sortSheetOpen = true"
				>
					<template #leading><UiIcon name="swap_vert" size="sm" /></template>
					Sort by
				</UiButton>
			</div>

			<SavedFiltersPanel
				v-if="tableData.structure && tableData.widgets"
				ref="savedFiltersPanel"
				:connection-i-d="connectionID"
				:selected-table-name="name"
				:selected-table-display-name="displayName"
				:structure="tableData.structure"
				:table-widgets="tableData.widgets"
				:table-foreign-keys="tableData.foreignKeys"
				:table-types="tableData.tableTypes"
				@filter-selected="onFilterSelected"
			/>
		</div>

		<div v-if="tableData.loading" class="table-view__skeleton">
			<PlaceholderTableData />
		</div>

		<div v-show="!tableData.loading" class="table-view__surface">
			<UiTable
				:columns="tableColumns"
				:rows="tableData.rows"
				:row-key="rowKey"
				:label="displayName || name"
				:sort="sort"
				:selectable="selectable"
				:selected="selection.keys"
				:select-row-label="(_row, index) => `select row ${index + 1}`"
				select-all-label="select all"
				:row-class="rowClass"
				interactive
				empty-text=""
				class="table-view__table"
				@update:selected="onSelected"
				@row-click="handleViewRow"
			>
				<template v-for="column in tableData.displayedDataColumns" :key="`header-${column}`" #[`header-${column}`]>
					<div class="table-view__header-cell" :class="{ 'table-view__header-cell--sorted': sort.active === column }">
						<span class="table-view__header-text">{{ tableData.dataNormalizedColumns[column] }}</span>
						<UiMenu v-if="isSortable(column)" :label="`Sort ${tableData.dataNormalizedColumns[column]}`">
							<template #trigger="{ triggerProps }">
								<UiIconButton
									v-bind="triggerProps"
									:icon="sortIcon(column)"
									:label="`Sort by ${tableData.dataNormalizedColumns[column]}`"
									size="sm"
									class="table-view__sort-button"
								/>
							</template>
							<UiMenuItem
								icon="arrow_upward"
								:class="{ 'table-view__sort-item--active': sort.active === column && sort.direction === 'asc' }"
								@select="applySort(column, 'asc')"
							>
								Ascending (A-Z)
							</UiMenuItem>
							<UiMenuItem
								icon="arrow_downward"
								:class="{ 'table-view__sort-item--active': sort.active === column && sort.direction === 'desc' }"
								@select="applySort(column, 'desc')"
							>
								Descending (Z-A)
							</UiMenuItem>
							<UiDivider />
							<UiMenuItem
								:icon="isDefaultSort(column) ? 'lock' : 'lock_open'"
								:disabled="!canToggleDefaultSort(column)"
								:description="!canToggleDefaultSort(column) ? 'Select sort order first' : undefined"
								@select="toggleDefaultSort(column)"
							>
								{{ isDefaultSort(column) ? 'Remove default' : 'Set as default' }}
							</UiMenuItem>
						</UiMenu>
					</div>
				</template>

				<template
					v-for="column in tableData.displayedDataColumns"
					:key="`cell-${column}`"
					#[`cell-${column}`]="{ row, index }"
				>
					<div class="table-view__cell ph-no-capture">
						<ForeignKeyDisplay
							v-if="isForeignKey(column)"
							:field-key="String(index)"
							:relations="tableData.foreignKeys[column]"
							:value="foreignKeyValue(row, column)"
							:is-selected="isForeignKeySelected(row, column)"
							@foreign-key-click="onForeignKeyClick(row, column)"
							@copy-to-clipboard="showCopyNotification"
						/>
						<component
							:is="widgetComponent(column)"
							v-else-if="widgetComponent(column)"
							:field-key="String(index)"
							:value="row[column]"
							:widget-structure="tableData.widgets[column]"
							:row-data="row"
							:primary-keys="tableData.keyAttributes"
							@copy-to-clipboard="showCopyNotification"
						/>
						<component
							:is="typeComponent(column)"
							v-else-if="typeComponent(column)"
							:field-key="String(index)"
							:value="row[column]"
							@copy-to-clipboard="showCopyNotification"
						/>
					</div>
				</template>

				<template v-if="hasActions" #actions="{ row, index }">
					<div class="table-view__row-actions">
						<UiIconButton
							v-for="action in tableData.tableActions"
							:key="action.id ?? action.title"
							:icon="action.icon"
							:label="action.title"
							size="sm"
							@click="handleAction(action, row)"
						/>
						<UiIconButton
							v-if="canEditRow"
							icon="create"
							label="Edit row"
							size="sm"
							:to="entryLink(tableData.getQueryParams(row))"
							:data-testid="`table-edit-record-${index}-link`"
							:data-test-primary-key-name="tableData.keyAttributes[0]?.column_name"
							:data-test-primary-key-value="row[tableData.keyAttributes[0]?.column_name ?? '']"
							@click="stashUrlParams(); track('Dashboard: edit row is clicked')"
						/>
						<UiIconButton
							v-if="canAddRow"
							icon="difference"
							label="Duplicate row"
							size="sm"
							:to="entryLink(tableData.getQueryParams(row, 'dub'))"
							:data-testid="`table-duplicate-record-${index}-link`"
							@click="stashUrlParams(); track('Dashboard: duplicate row is clicked')"
						/>
						<UiIconButton
							v-if="canDeleteRow && tableData.canDelete"
							icon="delete"
							label="Delete row"
							size="sm"
							:data-testid="`table-delete-record-${index}-button`"
							@click="handleDeleteRow(row)"
						/>
					</div>
				</template>
			</UiTable>

			<div v-if="tableData.isEmptyTable && !filtersCount && searchString" class="table-view__empty">
				<p>No field matches <span class="table-view__mono">"{{ staticSearchString }}"</span>.</p>
				<p>If you want to find <u>substring</u>, please, use <strong>Filter</strong>.</p>
			</div>

			<div
				v-if="tableData.isEmptyTable && (filtersCount || hasSavedFilterActive) && !searchString"
				class="table-view__empty"
			>
				<UiIcon name="filter_list_off" size="lg" class="table-view__empty-icon" />
				<p>{{ hasSavedFilterActive ? 'No records match the selected fast filter' : 'No records match this filter' }}</p>
			</div>

			<div
				v-if="tableData.isEmptyTable && !(filtersCount || hasSavedFilterActive || searchString)"
				class="table-view__empty"
			>
				<UiButton
					variant="secondary"
					:to="entryLink()"
					data-testid="table-add-record-in-empty-table-link"
					@click="track('Dashboard: add row is clicked')"
				>
					<template #leading><UiIcon name="add" size="sm" /></template>
					Add row
				</UiButton>
			</div>

			<UiPaginator
				v-model:page-index="pageIndex"
				v-model:page-size="pageSize"
				:length="tableData.total"
				:page-size-options="[10, 30, 100, 300]"
				:show-first-last="!tableData.largeDataset"
				items-per-page-label="Rows per page:"
				data-testid="table-paginator"
				@page="onPage"
			/>
		</div>

		<!-- Table switcher sheet -->
		<TableSheet v-if="tableSwitcherOpen" title="Select table" @close="closeTableSwitcher">
			<template #header>
				<div class="table-view__sheet-search">
					<UiIcon name="search" size="sm" />
					<input
						ref="tableSwitcherInput"
						v-model="tableSwitcherSearch"
						type="text"
						class="table-view__sheet-search-input"
						placeholder="Search tables"
						aria-label="Search tables"
						autocomplete="off"
					>
					<UiIconButton
						v-if="tableSwitcherSearch"
						icon="close"
						label="Clear search"
						size="sm"
						@click="tableSwitcherSearch = ''"
					/>
				</div>
			</template>
			<template v-for="folder in switcher.folders" :key="folder.category_id ?? ''">
				<button
					type="button"
					class="table-view__sheet-group"
					:aria-expanded="!isFolderCollapsed(folder.category_id ?? '')"
					@click="toggleFolderCollapse(folder.category_id ?? '')"
				>
					<UiIcon
						:name="folder.category_id === 'all-tables-kitten' ? 'dehaze' : 'folder'"
						size="sm"
						:style="folder.category_id !== 'all-tables-kitten' && folder.category_color ? { color: folder.category_color } : undefined"
					/>
					<span class="table-view__sheet-group-name">{{ folder.category_name }}</span>
					<span class="table-view__sheet-group-count">{{ folder.tables.length }}</span>
					<UiIcon :name="isFolderCollapsed(folder.category_id ?? '') ? 'chevron_right' : 'expand_more'" size="sm" />
				</button>
				<template v-if="!isFolderCollapsed(folder.category_id ?? '')">
					<button
						v-for="item in folder.tables"
						:key="item.table"
						type="button"
						class="table-view__sheet-item"
						:class="{ 'table-view__sheet-item--active': item.table === name }"
						@click="switchTableFromSheet(item.table)"
					>
						<span class="table-view__sheet-item-name">{{ item.normalizedTableName || item.display_name || item.table }}</span>
						<UiIcon v-if="item.table === name" name="check" size="sm" />
					</button>
				</template>
			</template>
			<template v-if="switcher.uncategorized.length">
				<div class="table-view__sheet-group">Others</div>
				<button
					v-for="item in switcher.uncategorized"
					:key="item.table"
					type="button"
					class="table-view__sheet-item"
					:class="{ 'table-view__sheet-item--active': item.table === name }"
					@click="switchTableFromSheet(item.table)"
				>
					<span class="table-view__sheet-item-name">{{ item.normalizedTableName || item.display_name || item.table }}</span>
					<UiIcon v-if="item.table === name" name="check" size="sm" />
				</button>
			</template>
			<p
				v-if="tableSwitcherSearch && !switcher.folders.length && !switcher.uncategorized.length"
				class="table-view__sheet-empty"
			>
				No tables match "{{ tableSwitcherSearch }}".
			</p>
		</TableSheet>

		<!-- Sort sheet -->
		<TableSheet v-if="sortSheetOpen" title="Sort by" @close="closeSortSheet">
			<template v-for="column in sortableDataColumns" :key="column">
				<button
					type="button"
					class="table-view__sheet-item"
					:aria-expanded="sortExpandedColumn === column"
					@click="toggleSortColumn(column)"
				>
					<span class="table-view__sheet-item-name">{{ tableData.dataNormalizedColumns[column] }}</span>
					<UiIcon :name="sortIcon(column)" size="sm" />
				</button>
				<div v-if="sortExpandedColumn === column" class="table-view__sort-options">
					<UiButton
						variant="ghost"
						size="sm"
						:class="{ 'table-view__sort-item--active': sort.active === column && sort.direction === 'asc' }"
						@click="applySort(column, 'asc')"
					>
						<template #leading><UiIcon name="arrow_upward" size="sm" /></template>
						Ascending (A-Z)
					</UiButton>
					<UiButton
						variant="ghost"
						size="sm"
						:class="{ 'table-view__sort-item--active': sort.active === column && sort.direction === 'desc' }"
						@click="applySort(column, 'desc')"
					>
						<template #leading><UiIcon name="arrow_downward" size="sm" /></template>
						Descending (Z-A)
					</UiButton>
					<UiButton
						variant="ghost"
						size="sm"
						:class="{ 'table-view__sort-item--active': isDefaultSort(column) }"
						:disabled="!canToggleDefaultSort(column)"
						@click="toggleDefaultSort(column)"
					>
						<template #leading><UiIcon name="push_pin" size="sm" /></template>
						{{ isDefaultSort(column) ? 'Remove default' : 'Set as default' }}
					</UiButton>
				</div>
			</template>
		</TableSheet>

		<!-- Columns sheet -->
		<TableSheet v-if="columnsSheetOpen" title="Columns" @close="columnsSheetOpen = false">
			<ColumnsList
				:columns="tableData.columns"
				:displayed-count="tableData.displayedDataColumns.length"
				@visibility-change="onColumnVisibilityChange"
				@reorder="onColumnsReorder"
			/>
		</TableSheet>

		<!-- Import / export sheet -->
		<TableSheet v-if="transferSheetOpen" title="Import / Export" @close="transferSheetOpen = false">
			<button
				v-if="tableData.isImportAllowed"
				type="button"
				class="table-view__sheet-item"
				@click="transferSheetOpen = false; handleOpenImportDialog()"
			>
				<UiIcon name="upload" size="sm" />
				<span class="table-view__sheet-item-name">Import</span>
			</button>
			<button
				v-if="tableData.isExportAllowed"
				type="button"
				class="table-view__sheet-item"
				@click="transferSheetOpen = false; handleOpenExportDialog()"
			>
				<UiIcon name="download" size="sm" />
				<span class="table-view__sheet-item-name">Export</span>
			</button>
		</TableSheet>
	</div>
</template>

<style scoped>
.table-view {
	display: flex;
	flex-direction: column;
	gap: var(--space-3);
}

.table-view__pull {
	display: none;
}

.table-view__header {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--space-3);
}

.table-view__title {
	display: flex;
	align-items: center;
	gap: var(--space-1);
	min-width: 0;
}

.table-view__name {
	margin: 0;
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
}

.table-view__switcher,
.table-view__mobile-only,
.table-view__fab,
.table-view__mobile-actions,
.table-view__select-all {
	display: none;
}

.table-view__refresh {
	flex-shrink: 0;
}

.table-view__ai-icon {
	width: 1.25rem;
	height: 1.25rem;
}

.table-view__ai-icon-button {
	align-items: center;
	justify-content: center;
	width: 2.5rem;
	height: 2.5rem;
	border: 0;
	border-radius: var(--radius-pill);
	background: transparent;
	cursor: pointer;
}

.table-view__bulk-actions,
.table-view__actions-bar,
.table-view__actions,
.table-view__search-row,
.table-view__search-buttons {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--space-2);
}

.table-view__actions-bar {
	flex: 1;
	justify-content: space-between;
}

.table-view__search {
	display: flex;
	align-items: center;
	gap: var(--space-1);
	min-width: 16rem;
	padding: 0 var(--space-2);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-control);
	background: var(--color-surface);
}

.table-view__search:focus-within {
	box-shadow: var(--ring-focus);
}

.table-view__search-icon {
	color: var(--color-muted);
}

.table-view__search-input {
	flex: 1;
	border: 0;
	box-shadow: none;
	background: transparent;
}

.table-view__search-input:focus {
	box-shadow: none;
}

.table-view__action--active {
	position: relative;
	color: var(--color-accent);
}

.table-view__action--active::after {
	content: '';
	position: absolute;
	top: var(--space-1);
	right: var(--space-1);
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--color-accent);
}

.table-view__columns {
	position: relative;
}

.table-view__columns-count {
	color: var(--color-muted);
	font-size: var(--text-sm);
}

.table-view__columns-panel {
	position: absolute;
	inset-inline-end: 0;
	top: calc(100% + var(--space-1));
	z-index: var(--z-dropdown);
	min-width: 16rem;
	max-height: 60vh;
	overflow-y: auto;
	border: 1px solid var(--color-line);
	border-radius: var(--radius-panel);
	background: var(--color-surface-raised);
	box-shadow: var(--shadow-lift);
}

.table-view__active-filters {
	display: flex;
	flex-wrap: wrap;
	gap: var(--space-2);
}

.table-view__filter-chip {
	display: inline-flex;
	align-items: center;
	gap: var(--space-05);
	padding-inline-start: var(--space-3);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-pill);
	background: var(--color-paper-2);
	font-size: var(--text-sm);
}

.table-view__filter-chip-label {
	padding: 0;
	border: 0;
	background: transparent;
	color: var(--color-ink);
	font: inherit;
	cursor: pointer;
}

.table-view__filter-chip-label:focus-visible {
	outline: none;
	box-shadow: var(--ring-focus);
}

.table-view__saved-filters-row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--space-2);
}

.table-view__skeleton,
.table-view__surface {
	border: 1px solid var(--color-line);
	border-radius: var(--radius-card);
	background: var(--color-surface);
	box-shadow: var(--shadow-card);
	overflow: hidden;
}

.table-view__table {
	max-height: none;
}

:deep(.table-view__row--open) {
	background: var(--color-paper-2);
}

.table-view__header-cell {
	display: flex;
	align-items: center;
	gap: var(--space-1);
}

.table-view__header-text {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.table-view__sort-button {
	opacity: 0.5;
}

.table-view__header-cell:hover .table-view__sort-button,
.table-view__header-cell--sorted .table-view__sort-button {
	opacity: 1;
}

.table-view__sort-item--active {
	color: var(--color-accent);
}

.table-view__cell {
	max-width: 20rem;
	overflow: hidden;
}

.table-view__row-actions {
	display: flex;
	align-items: center;
	justify-content: flex-end;
}

.table-view__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--space-2);
	padding: var(--space-8) var(--space-4);
	color: var(--color-ink-soft);
	text-align: center;
}

.table-view__empty p {
	margin: 0;
}

.table-view__empty-icon {
	color: var(--color-muted);
}

.table-view__mono {
	font-family: var(--font-mono);
}

.table-view__quick-chips {
	align-items: center;
	gap: var(--space-1);
	overflow-x: auto;
}

.table-view__quick-chip {
	display: inline-flex;
	flex: 0 0 auto;
	align-items: center;
	padding-inline-start: var(--space-3);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-pill);
}

.table-view__quick-chip--active {
	border-color: var(--color-accent);
	color: var(--color-accent);
}

.table-view__quick-chip-label {
	padding: var(--space-1) 0;
	border: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	cursor: pointer;
}

.table-view__divider {
	width: 1px;
	height: 1.5rem;
	background: var(--color-line);
}

.table-view__sheet-search {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	margin: 0 var(--space-4) var(--space-2);
	padding: var(--space-2) var(--space-3);
	border-radius: var(--radius-control);
	background: var(--color-paper-2);
}

.table-view__sheet-search-input {
	flex: 1;
	border: 0;
	background: transparent;
	color: var(--color-ink);
	font: inherit;
	outline: none;
}

.table-view__sheet-group,
.table-view__sheet-item {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	width: 100%;
	padding: var(--space-3) var(--space-5);
	border: 0;
	background: transparent;
	color: var(--color-ink);
	font: inherit;
	text-align: start;
	cursor: pointer;
}

.table-view__sheet-group {
	color: var(--color-ink-soft);
	font-size: var(--text-sm);
	font-weight: var(--weight-semibold);
}

.table-view__sheet-group-name,
.table-view__sheet-item-name {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.table-view__sheet-group-count {
	color: var(--color-muted);
}

.table-view__sheet-item--active {
	color: var(--color-accent);
	font-weight: var(--weight-medium);
}

.table-view__sheet-empty {
	padding: var(--space-4) var(--space-5);
	color: var(--color-muted);
}

.table-view__sort-options {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	padding: 0 var(--space-5) var(--space-2);
}

@media (width <= 600px) {
	.table-view__pull {
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		color: var(--color-muted);
		transition: height var(--motion-fast);
	}

	.table-view__pull-icon--spinning {
		animation: table-view-spin var(--spin-duration) linear infinite;
	}

	.table-view__name,
	.table-view__desktop-only,
	.table-view__columns-count,
	.table-view__action-label {
		display: none;
	}

	.table-view__switcher {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		min-width: 0;
		padding: var(--space-1) var(--space-2);
		border: 0;
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--color-ink);
		font: inherit;
		font-size: var(--text-lg, var(--text-xl));
		font-weight: var(--weight-semibold);
		cursor: pointer;
	}

	.table-view__switcher-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.table-view__mobile-only,
	.table-view__select-all,
	.table-view__mobile-actions {
		display: inline-flex;
	}

	.table-view__search {
		flex: 1;
		min-width: 0;
	}

	.table-view__search-row {
		width: 100%;
	}

	.table-view__fab {
		position: fixed;
		right: var(--space-4);
		bottom: calc(var(--space-4) + env(safe-area-inset-bottom, 0));
		z-index: var(--z-sticky);
		display: inline-flex;
		box-shadow: var(--shadow-lift);
	}
}

@keyframes table-view-spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
