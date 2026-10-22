<script setup lang="ts">
/**
 * Port of db-table-view/saved-filters-panel: the saved ("fast") filters strip above the table.
 *
 * - One chip per saved filter (a dropdown on small screens). Choosing one writes its filters to the
 *   URL (`filters`, `saved_filter`, `dynamic_column`, first page, current page size and sort) and
 *   emits `filterSelected` with it; choosing it again clears the selection and emits `null`.
 * - A filter's quick-editing ("dynamic") column gets an inline comparator + value editor; edits are
 *   applied 800 ms after the last keystroke (or on Enter) the same way.
 * - Users who can edit the connection create, edit and delete filters (SavedFiltersDialog).
 *
 * The list is (re)loaded when the route's table changes and after the tables store announces a
 * saved filter was created, updated or deleted (the Angular `cast` strings, now `tableEvents`).
 * Exposed for the table view (its @ViewChild): `handleOpenSavedFiltersDialog()`, `savedFilterData`,
 * `selectedFilterSetId`, `selectFiltersSet()`, `handleEditFilter()`, `handleDeleteFilter()`.
 */
import JsonURL from '@jsonurl/jsonurl';
import posthog from 'posthog-js';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router';
import PlaceholderSavedFilters from '@/components/skeletons/PlaceholderSavedFilters.vue';
import { UiButton, UiChip, UiIcon, UiIconButton, UiMenu, UiMenuItem, UiSelect } from '@/components/ui';
import { trackEvent } from '@/composables/useAnalytics';
import { useDialog } from '@/composables/useDialog';
import { onTableEvent } from '@/lib/table-events';
import type { TableField, WidgetStructure } from '@/models/table';
import { useConnectionsStore } from '@/stores/connections';
import { useTablesStore } from '@/stores/tables';
import { NUMBER_COMPARATOR_OPTIONS, type SavedFilterSet, TEXT_COMPARATOR_OPTIONS } from './SavedFiltersDialog.helpers';
import SavedFiltersDialog, { type SavedFiltersDialogData } from './SavedFiltersDialog.vue';
import {
	applyDynamicColumn,
	buildQueryParams,
	describeFilter,
	NUMBER_COMPARATOR_TEXT,
	type ProcessedSavedFilter,
	processFiltersData,
	type SavedFilterRecord,
	sortByCreation,
	TEXT_COMPARATOR_TEXT,
} from './SavedFiltersPanel.helpers';
import {
	columnFilterComponent,
	type FilterWidgetContext,
	type ForeignKeysByField,
	filterInputsFor,
	getFieldComparatorFamily,
	isWidget,
	resolveFilterComponent,
	structureByField,
	type WidgetsByField,
} from './TableFiltersDialog.helpers';

const props = withDefaults(
	defineProps<{
		connectionID: string;
		/** Replaced by the route's `:tableName` once it is known, as Angular did. */
		selectedTableName: string;
		selectedTableDisplayName: string;
		/** `getTableTypes(structure, foreignKeysList)` of the table view. */
		tableTypes: Record<string, string>;
		structure: TableField[];
		/** Foreign keys keyed by column. */
		tableForeignKeys?: ForeignKeysByField;
		/** Widgets keyed by column, `widget_params` parsed. */
		tableWidgets?: WidgetsByField;
		/** Set to true to drop the current selection (the table view's filters were reset). */
		resetSelection?: boolean;
	}>(),
	{ tableForeignKeys: () => ({}), tableWidgets: () => ({}), resetSelection: false },
);

const emit = defineEmits<{
	/** The chosen saved filter (with its dynamic column's current value), or `null` when cleared. */
	filterSelected: [filter: ProcessedSavedFilter | null];
}>();

const route = useRoute();
const router = useRouter();
const tables = useTablesStore();
const connections = useConnectionsStore();
const dialog = useDialog();

const tableName = ref(props.selectedTableName);
const savedFilterData = ref<SavedFilterRecord[] | null>(null);
const savedFilterMap = ref<Record<string, ProcessedSavedFilter>>({});
const selectedFilterSetId = ref<string | null>(null);
const shouldAutofocus = ref(false);

const canEditConnection = computed(() => connections.canEditConnection);
const tableRowStructure = computed(() => structureByField(props.structure));
const ctx = computed<FilterWidgetContext>(() => ({
	widgets: props.tableWidgets,
	inputs: filterInputsFor(connections.currentConnection.type),
	tableTypes: props.tableTypes ?? {},
}));

const selectedFilter = computed(() =>
	selectedFilterSetId.value ? (savedFilterMap.value[selectedFilterSetId.value] ?? null) : null,
);
const dynamicColumn = computed(() => selectedFilter.value?.dynamicColumn ?? null);
const dynamicFamily = computed(() =>
	dynamicColumn.value ? getFieldComparatorFamily(ctx.value, dynamicColumn.value.column) : 'nonComparable',
);

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let autofocusTimer: ReturnType<typeof setTimeout> | undefined;
onBeforeUnmount(() => {
	clearTimeout(debounceTimer);
	clearTimeout(autofocusTimer);
});

watch(
	() => routeParam('tableName'),
	(tableNameFromUrl) => {
		if (!tableNameFromUrl) return;
		savedFilterData.value = null;
		selectedFilterSetId.value = null;
		tableName.value = tableNameFromUrl;
		loadSavedFilters();
	},
	{ immediate: true },
);

watch(
	() => queryParam('saved_filter'),
	(savedFilterId) => {
		selectedFilterSetId.value = savedFilterId ?? null;
	},
	{ immediate: true },
);

watch(
	() => props.resetSelection,
	(reset) => {
		if (reset) selectedFilterSetId.value = null;
	},
);

onTableEvent('savedFilterCreated', () => loadSavedFilters());
onTableEvent('savedFilterUpdated', () => onSavedFilterUpdated());
onTableEvent('savedFilterDeleted', () => {
	loadSavedFilters();
	selectedFilterSetId.value = null;
	emit('filterSelected', null);
	navigate(buildQueryParams(route.query));
});

async function loadSavedFilters() {
	if (!props.connectionID || !tableName.value) return;
	let data: SavedFilterRecord[];
	try {
		data = (await tables.getSavedFilters(props.connectionID, tableName.value)) as SavedFilterRecord[];
	} catch (error) {
		console.error('Error fetching saved filters:', error);
		return;
	}
	if (!data) return;
	setFilters(data);

	const dynamic = parseJsonUrl<{ column_name: string; comparator: string }>(queryParam('dynamic_column'));
	const selected = selectedFilterSetId.value ? savedFilterMap.value[selectedFilterSetId.value] : undefined;
	if (dynamic && selected && savedFilterData.value?.length) {
		const filters = parseJsonUrl<Record<string, Record<string, unknown>>>(queryParam('filters')) ?? {};
		selected.dynamicColumn = {
			column: dynamic.column_name,
			operator: dynamic.comparator,
			value: filters[dynamic.column_name]?.[dynamic.comparator] || null,
		};
	}
}

/** 'filters set updated': refresh the list and, when a filter is selected, re-apply it from the server. */
async function onSavedFilterUpdated() {
	const savedFilterIdFromUrl = queryParam('saved_filter');
	if (!savedFilterIdFromUrl) {
		loadSavedFilters();
		return;
	}
	let data: SavedFilterRecord[];
	try {
		data = (await tables.getSavedFilters(props.connectionID, tableName.value)) as SavedFilterRecord[];
	} catch (error) {
		console.error('Error fetching updated filters:', error);
		loadSavedFilters();
		return;
	}
	if (!data) return;

	const updatedFilter = data.find((filter) => filter.id === savedFilterIdFromUrl);
	if (updatedFilter) {
		selectedFilterSetId.value = savedFilterIdFromUrl;
		emit('filterSelected', processFiltersData(updatedFilter));
		navigate(
			buildQueryParams(route.query, {
				filters: stringifyJsonUrl(updatedFilter.filters),
				saved_filter: savedFilterIdFromUrl,
				...(updatedFilter.dynamic_column && {
					dynamic_column: stringifyJsonUrl({
						column_name: updatedFilter.dynamic_column.column_name,
						comparator: updatedFilter.dynamic_column.comparator,
					}),
				}),
			}),
		);
	}
	setFilters(data);
}

function setFilters(data: SavedFilterRecord[]) {
	savedFilterData.value = sortByCreation(data);
	savedFilterMap.value = Object.fromEntries(data.map((filter) => [filter.id, processFiltersData(filter)]));
}

function handleOpenSavedFiltersDialog(filtersSet: SavedFilterSet | null = null) {
	const data: SavedFiltersDialogData = {
		connectionID: props.connectionID,
		tableName: tableName.value,
		displayTableName: props.selectedTableDisplayName,
		structure: props.structure,
		tableForeignKeys: props.tableForeignKeys,
		tableWidgets: props.tableWidgets,
		filtersSet: filtersSet ?? { name: '', filters: {} },
	};
	dialog.open(SavedFiltersDialog, { data });
}

function openCreateDialog(action: string) {
	handleOpenSavedFiltersDialog();
	trackEvent(action);
	posthog.capture(action);
}

function handleEditFilter(filter: SavedFilterRecord | null) {
	if (filter) handleOpenSavedFiltersDialog(filter);
}

async function handleDeleteFilter(filter: SavedFilterRecord | null) {
	if (!filter) return;
	try {
		await tables.deleteSavedFilter(props.connectionID, tableName.value, filter.id);
	} catch (error) {
		console.error('Error deleting filter:', error);
	}
}

function selectFiltersSet(id: string) {
	if (selectedFilterSetId.value === id) {
		selectedFilterSetId.value = null;
		emit('filterSelected', null);
		shouldAutofocus.value = false;
		navigate(buildQueryParams(route.query));
		return;
	}

	selectedFilterSetId.value = id;
	shouldAutofocus.value = true;
	const filter = savedFilterMap.value[id];
	if (!filter) return;
	emit('filterSelected', filter);
	navigate(
		buildQueryParams(route.query, {
			filters: stringifyJsonUrl(filter.filters),
			saved_filter: id,
			...(filter.dynamicColumn && {
				dynamic_column: stringifyJsonUrl({
					column_name: filter.dynamicColumn.column,
					comparator: filter.dynamicColumn.operator,
				}),
			}),
		}),
	);
	clearTimeout(autofocusTimer);
	autofocusTimer = setTimeout(() => {
		shouldAutofocus.value = false;
	}, 500);
}

function updateDynamicColumnComparator(comparator: string) {
	const dynamic = selectedFilter.value?.dynamicColumn;
	if (!dynamic) {
		console.error('No dynamic column on the selected saved filter');
		return;
	}
	dynamic.operator = comparator;
	if (comparator === 'empty') dynamic.value = '';
}

function updateDynamicColumnValue(value: unknown) {
	const dynamic = selectedFilter.value?.dynamicColumn;
	if (!dynamic) {
		console.error('No dynamic column on the selected saved filter');
		return;
	}
	dynamic.value = value;
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => applyDynamicColumnChanges(), 800);
}

function applyDynamicColumnChanges() {
	const filter = selectedFilter.value;
	if (!selectedFilterSetId.value || !filter) return;
	const applied = applyDynamicColumn(filter);
	if (!applied) return;

	emit('filterSelected', {
		...filter,
		filters: applied.filters,
		dynamic_column: applied.dynamicColumn,
		filterEntries: processFiltersData({ ...filter, filters: applied.filters }).filterEntries,
	});
	navigate(
		buildQueryParams(route.query, {
			filters: stringifyJsonUrl(applied.filters),
			dynamic_column: stringifyJsonUrl(applied.dynamicColumn),
			saved_filter: selectedFilterSetId.value,
		}),
	);
}

/** The dynamic column's widget when it manages its own comparator (or has none). */
function dynamicWidget(column: string) {
	return resolveFilterComponent(ctx.value, column);
}

function dynamicWidgetInputs(column: string): Record<string, unknown> {
	const relations = props.tableTypes?.[column] === 'foreign key' ? props.tableForeignKeys[column] : undefined;
	const value = dynamicColumn.value?.value;
	if (isWidget(props.tableWidgets, column)) {
		const widget = props.tableWidgets[column] as WidgetStructure;
		return {
			fieldKey: column,
			label: widget.name || column,
			value,
			widgetStructure: widget,
			relations,
			autofocus: shouldAutofocus.value,
		};
	}
	return {
		fieldKey: column,
		label: column,
		value,
		structure: tableRowStructure.value[column],
		relations,
		autofocus: shouldAutofocus.value,
	};
}

/** The text/number column's own value widget, next to the comparator select. */
function dynamicValueInputs(column: string): Record<string, unknown> {
	return {
		fieldKey: column,
		label: column,
		value: dynamicColumn.value?.value,
		readonly: dynamicColumn.value?.operator === 'empty',
		structure: tableRowStructure.value[column],
		relations: props.tableTypes?.[column] === 'foreign key' ? props.tableForeignKeys[column] : undefined,
		autofocus: shouldAutofocus.value,
	};
}

function comparatorWord(operator: string): string | undefined {
	return dynamicFamily.value === 'text' ? TEXT_COMPARATOR_TEXT[operator] : NUMBER_COMPARATOR_TEXT[operator];
}

function navigate(query: LocationQueryRaw) {
	router.push({ path: `/dashboard/${props.connectionID}/${tableName.value}`, query });
}

function routeParam(name: string): string | undefined {
	const value = route.params[name];
	return (Array.isArray(value) ? value[0] : value) || undefined;
}

function queryParam(name: string): string | undefined {
	const value = route.query[name];
	return (Array.isArray(value) ? value[0] : value) ?? undefined;
}

function parseJsonUrl<T>(value: string | undefined): T | undefined {
	if (!value) return undefined;
	try {
		return JsonURL.parse(value) as T;
	} catch {
		return undefined;
	}
}

function stringifyJsonUrl(value: unknown): string | undefined {
	return JsonURL.stringify(value) ?? undefined;
}

// What db-table-view reached through @ViewChild: "create quick filter" and its own mobile chips.
defineExpose({
	handleOpenSavedFiltersDialog,
	savedFilterData,
	selectedFilterSetId,
	selectFiltersSet,
	handleEditFilter,
	handleDeleteFilter,
});
</script>

<template>
	<div class="saved-filters">
		<PlaceholderSavedFilters v-if="savedFilterData === null" />
		<div v-else class="saved-filters__bar">
			<div class="saved-filters__list">
				<UiButton
					v-if="canEditConnection && savedFilterData.length === 0"
					variant="ghost"
					@click="openCreateDialog('Saved filters: first time setup is clicked')"
				>
					<template #leading><UiIcon name="tune" size="sm" /></template>
					Create fast filter
				</UiButton>

				<UiIconButton
					v-if="canEditConnection && savedFilterData.length !== 0"
					icon="bookmark_add"
					label="Create new fast filter"
					@click="openCreateDialog('Saved filters: create new filter is clicked')"
				/>

				<div class="saved-filters__chips" role="group" aria-label="Fast filters">
					<div
						v-for="filter in savedFilterData"
						:key="filter.id"
						class="saved-filters__chip"
						:class="{ 'saved-filters__chip--selected': filter.id === selectedFilterSetId }"
					>
						<button
							type="button"
							class="saved-filters__chip-button"
							:aria-pressed="filter.id === selectedFilterSetId ? 'true' : 'false'"
							@click="selectFiltersSet(filter.id)"
						>
							{{ filter.name }}
						</button>
						<UiMenu v-if="canEditConnection" :label="`${filter.name} options`" class="saved-filters__chip-menu">
							<template #trigger="{ triggerProps }">
								<UiIconButton v-bind="triggerProps" icon="more_vert" label="Filter options" size="sm" />
							</template>
							<UiMenuItem icon="create" @select="handleEditFilter(filter)">Edit</UiMenuItem>
							<UiMenuItem icon="delete" @select="handleDeleteFilter(filter)">Delete</UiMenuItem>
						</UiMenu>
					</div>
				</div>
			</div>

			<!-- Small screens: one dropdown for every filter. -->
			<UiMenu v-if="savedFilterData.length !== 0" class="saved-filters__mobile" label="Fast filters">
				<template #trigger="{ triggerProps }">
					<UiButton
						v-bind="triggerProps"
						variant="secondary"
						class="saved-filters__trigger"
						:class="{ 'saved-filters__trigger--active': selectedFilterSetId }"
					>
						<template #leading><UiIcon name="tune" size="sm" /></template>
						<span class="saved-filters__trigger-label">{{ selectedFilter?.name || 'Fast filters' }}</span>
						<template #trailing><UiIcon name="arrow_drop_down" size="sm" /></template>
					</UiButton>
				</template>
				<UiMenuItem
					v-for="filter in savedFilterData"
					:key="filter.id"
					:icon="filter.id === selectedFilterSetId ? 'check' : undefined"
					@select="selectFiltersSet(filter.id)"
				>
					{{ filter.name }}
				</UiMenuItem>
				<template v-if="canEditConnection">
					<!-- Angular nested a row menu in each item; a UiMenu can't nest, so the selected filter's actions follow. -->
					<template v-if="selectedFilter">
						<UiMenuItem icon="create" @select="handleEditFilter(selectedFilter)">Edit {{ selectedFilter.name }}</UiMenuItem>
						<UiMenuItem icon="delete" @select="handleDeleteFilter(selectedFilter)">Delete {{ selectedFilter.name }}</UiMenuItem>
					</template>
					<UiMenuItem icon="bookmark_add" @select="openCreateDialog('Saved filters: create new filter is clicked')">
						New fast filter
					</UiMenuItem>
				</template>
			</UiMenu>
		</div>

		<div v-if="dynamicColumn || selectedFilter?.staticFilters?.length" class="saved-filters__where">
			<span class="saved-filters__where-label">
				<UiIcon name="subdirectory_arrow_right" size="sm" />
				where
			</span>
			<form v-if="dynamicColumn" class="dynamic-column" @submit.prevent="applyDynamicColumnChanges">
				<span class="dynamic-column__name">
					<strong>{{ dynamicColumn.column }}</strong>
					<span v-if="dynamicFamily !== 'nonComparable'" class="dynamic-column__comparator-text">
						{{ comparatorWord(dynamicColumn.operator) }}
					</span>
				</span>

				<template v-if="dynamicFamily === 'nonComparable'">
					<component
						:is="dynamicWidget(dynamicColumn.column)"
						v-if="dynamicWidget(dynamicColumn.column)"
						:key="`${selectedFilterSetId}-${dynamicColumn.column}`"
						v-bind="dynamicWidgetInputs(dynamicColumn.column)"
						@field-change="updateDynamicColumnValue"
						@comparator-change="updateDynamicColumnComparator"
					/>
				</template>
				<template v-else>
					<UiSelect
						class="dynamic-column__comparator"
						:model-value="dynamicColumn.operator"
						:options="dynamicFamily === 'text' ? TEXT_COMPARATOR_OPTIONS : NUMBER_COMPARATOR_OPTIONS"
						size="sm"
						:name="dynamicFamily === 'text' ? 'textComparator' : 'numberComparator'"
						:aria-label="`${dynamicColumn.column} comparator`"
						@update:model-value="(comparator) => comparator && updateDynamicColumnComparator(comparator as string)"
					/>
					<component
						:is="columnFilterComponent(ctx, dynamicColumn.column)"
						v-if="columnFilterComponent(ctx, dynamicColumn.column)"
						:key="`${selectedFilterSetId}-${dynamicColumn.column}`"
						v-bind="dynamicValueInputs(dynamicColumn.column)"
						@field-change="updateDynamicColumnValue"
					/>
				</template>
			</form>
			<div v-if="selectedFilter?.staticFilters?.length" class="saved-filters__static">
				<UiChip
					v-for="(entry, index) in selectedFilter.staticFilters"
					:key="index"
					class="saved-filters__static-chip ph-no-capture"
				>
					{{ describeFilter(entry) }}
				</UiChip>
			</div>
		</div>
	</div>
</template>

<style scoped>
.saved-filters {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 100%;
}

.saved-filters__bar {
  display: flex;
  align-items: flex-start;
  margin-bottom: var(--space-3);
}

.saved-filters__list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.saved-filters__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.saved-filters__chip {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  transition: background-color var(--motion-fast) var(--ease-out);
}

.saved-filters__chip:hover {
  background: var(--color-paper-2);
}

.saved-filters__chip--selected {
  border-color: var(--color-accent);
  background: var(--color-paper-2);
}

.saved-filters__chip-button {
  padding: var(--space-1) var(--space-3);
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  font: inherit;
  font-size: var(--text-sm);
  color: var(--color-ink);
  cursor: pointer;
}

.saved-filters__chip--selected .saved-filters__chip-button {
  color: var(--color-accent);
  font-weight: var(--weight-medium);
}

.saved-filters__chip-button:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

.saved-filters__chip-menu {
  margin-inline-end: var(--space-05);
}

.saved-filters__mobile {
  display: none;
}

.saved-filters__trigger-label {
  max-width: 12.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.saved-filters__where {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}

.saved-filters__where-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  color: var(--color-muted);
}

.dynamic-column {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.dynamic-column__name {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-ink);
}

.dynamic-column__comparator-text {
  display: none;
}

.saved-filters__static {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.saved-filters__static-chip {
  max-width: 20rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (width <= 600px) {
  .saved-filters__list {
    display: none;
  }

  .saved-filters__mobile {
    display: block;
  }

  .saved-filters__trigger--active {
    max-width: 100%;
  }

  .saved-filters__where {
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-card);
    background: var(--color-paper-2);
  }

  .dynamic-column {
    flex: 1 1 100%;
  }

  .dynamic-column__name {
    flex: 1 1 100%;
    font-size: var(--text-xs);
    color: var(--color-muted);
  }

  .dynamic-column__comparator {
    display: none;
  }

  .dynamic-column__comparator-text {
    display: inline-flex;
    padding: var(--space-05) var(--space-2);
    border-radius: var(--radius-pill);
    background: var(--color-paper-2);
    color: var(--color-accent);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
  }
}
</style>
