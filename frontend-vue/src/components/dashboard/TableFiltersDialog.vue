<script setup lang="ts">
/**
 * Port of dashboard/db-table-view/db-table-filters-dialog: builds the table filters, one line per
 * column with its filter widget (`@/consts/filter-types`, or the column's configured widget).
 *
 * Initial state, as in Angular: none with a `saved_filter` in the URL; else the URL's `filters`;
 * else the columns marked "searched" in the table settings (`eq`, no value). `data.autofocusField`
 * (an active-filter chip was clicked) adds that column and focuses its control.
 *
 * Closing: Angular closed with `'filter'` / `'reset'` and the caller then read the dialog's
 * `tableRowFieldsShown` / `tableRowFieldsComparator` off `componentInstance`. A Vue dialog has no
 * instance to read, so the result carries them: `{ action, filters, comparators }`
 * (`TableFiltersDialogResult`). Cancel, Escape and the settings link close with `undefined`.
 */
import JsonURL from '@jsonurl/jsonurl';
import posthog from 'posthog-js';
import { type Component, computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { usesDefaultFilter } from '@/components/fields/filter/comparatorType';
import DefaultFilter from '@/components/fields/filter/DefaultFilter.vue';
import { type AutocompleteOption, UiAutocomplete, UiButton, UiField, UiIconButton } from '@/components/ui';
import { trackEvent } from '@/composables/useAnalytics';
import { useDialogRef } from '@/composables/useDialog';
import { getComparatorsFromUrl, getFiltersFromUrl } from '@/lib/parse-filter-params';
import { getTableTypes } from '@/lib/setup-table-row-structure';
import type { TableField, Widget, WidgetStructure } from '@/models/table';
import { useConnectionsStore } from '@/stores/connections';
import {
	type FiltersByField,
	type FilterWidgetContext,
	type ForeignKeysByField,
	filterInputsFor,
	getInputType,
	isWidget,
	resolveFilterComponent,
	structureByField,
	type WidgetsByField,
	widgetsByField,
} from './TableFiltersDialog.helpers';

export interface TableFiltersDialogData {
	connectionID: string;
	tableName: string;
	displayTableName: string;
	structure: {
		structure: TableField[];
		foreignKeysList: string[];
		foreignKeys: ForeignKeysByField;
		/** The table view's widgets, keyed by column (or a plain array). */
		widgets?: Record<string, Widget | WidgetStructure> | (Widget | WidgetStructure)[] | null;
	};
	/** Column to add (if missing) and focus: the active-filter chip that was clicked. */
	autofocusField?: string | null;
}

export interface TableFiltersDialogResult {
	/** `'filter'`: apply these filters. `'reset'`: drop every filter (`filters` is then `{}`). */
	action: 'filter' | 'reset';
	/** Column → value, the Angular `tableRowFieldsShown`; a column added but left empty is `undefined`. */
	filters: Record<string, unknown>;
	/** Column → comparator (`eq`, `contains`, …), the Angular `tableRowFieldsComparator`. */
	comparators: Record<string, string>;
}

const props = defineProps<{
	data: TableFiltersDialogData;
}>();

const dialogRef = useDialogRef<TableFiltersDialogResult>();
const route = useRoute();
const connections = useConnectionsStore();

const structure = props.data.structure.structure ?? [];
const tableForeignKeys: ForeignKeysByField = { ...props.data.structure.foreignKeys };
const tableRowStructure = structureByField(structure);
const tableTypes: Record<string, string> = getTableTypes(structure, props.data.structure.foreignKeysList ?? []);
const autofocusField = props.data.autofocusField || null;

const parsedWidgets = widgetsByField(props.data.structure.widgets);
const tableWidgets: WidgetsByField | undefined = Object.keys(parsedWidgets).length ? parsedWidgets : undefined;

const ctx = computed<FilterWidgetContext>(() => ({
	widgets: tableWidgets,
	inputs: filterInputsFor(connections.currentConnection.type),
	tableTypes,
}));

/** Columns the dialog opened with (URL, settings or autofocus); drives the Reset button only. */
const tableFilters = ref<string[]>([]);
const tableRowFieldsShown = ref<Record<string, unknown>>({});
const tableRowFieldsComparator = ref<Record<string, string>>({});

// ngOnInit
if (!route.query.saved_filter) {
	const filters = parseFilters(firstQueryValue(route.query.filters));
	const filtersValues = getFiltersFromUrl(filters);
	if (Object.keys(filtersValues).length) {
		tableFilters.value = Object.keys(filtersValues);
		tableRowFieldsShown.value = filtersValues;
		tableRowFieldsComparator.value = definedComparators(getComparatorsFromUrl(filters));
	} else {
		const fieldsToSearch = structure.filter((field) => field.isSearched);
		if (fieldsToSearch.length) {
			tableFilters.value = fieldsToSearch.map((field) => field.column_name);
			tableRowFieldsShown.value = Object.fromEntries(fieldsToSearch.map((field) => [field.column_name, undefined]));
			tableRowFieldsComparator.value = Object.fromEntries(fieldsToSearch.map((field) => [field.column_name, 'eq']));
		}
	}
}

if (autofocusField && !tableFilters.value.includes(autofocusField)) {
	tableFilters.value.push(autofocusField);
	if (!tableRowFieldsShown.value[autofocusField]) tableRowFieldsShown.value[autofocusField] = undefined;
	if (!tableRowFieldsComparator.value[autofocusField]) tableRowFieldsComparator.value[autofocusField] = 'eq';
}

const fields = computed(() =>
	structure
		.filter((field) => getInputType(ctx.value, field.column_name) !== 'file')
		.map((field) => ({ key: field.column_name, label: getFieldLabel(field.column_name) })),
);

const fieldSearch = ref('');
const foundFields = computed<AutocompleteOption<string>[]>(() => {
	const value = fieldSearch.value.toLowerCase();
	return fields.value
		.filter((field) => field.key.toLowerCase().includes(value) || field.label.toLowerCase().includes(value))
		.map((field) => ({ value: field.key, label: field.label, disabled: isFieldAlreadyFiltered(field.key) }));
});

/** `tableRowFieldsShown | keyvalue`: the pipe orders by key. */
const shownKeys = computed(() => Object.keys(tableRowFieldsShown.value).sort());
const tableFiltersCount = computed(() => Object.keys(tableRowFieldsShown.value).length);

const root = ref<HTMLElement | null>(null);
let focusTimer: ReturnType<typeof setTimeout> | undefined;

onMounted(() => {
	if (autofocusField) focusTimer = setTimeout(() => focusOnField(autofocusField), 200);
});
onBeforeUnmount(() => clearTimeout(focusTimer));

function isFieldAlreadyFiltered(key: string): boolean {
	return Object.hasOwn(tableRowFieldsShown.value, key);
}

function getFieldLabel(key: string): string {
	return tableWidgets?.[key]?.name || key;
}

function getFilterComponent(field: string): Component | undefined {
	const valueComponent = resolveFilterComponent(ctx.value, field);
	return usesDefaultFilter(valueComponent) ? DefaultFilter : valueComponent;
}

function getFilterInputs(field: string): Record<string, unknown> {
	const valueComponent = resolveFilterComponent(ctx.value, field);
	const baseInputs: Record<string, unknown> = {
		fieldKey: field,
		label: getFieldLabel(field),
		value: tableRowFieldsShown.value[field],
		structure: tableRowStructure[field],
		relations: tableTypes[field] === 'foreign key' ? tableForeignKeys[field] : undefined,
		autofocus: autofocusField === field,
	};
	if (usesDefaultFilter(valueComponent)) {
		return { ...baseInputs, valueComponent, comparator: tableRowFieldsComparator.value[field] || 'eq' };
	}
	if (isWidget(tableWidgets, field)) {
		return { ...baseInputs, widgetStructure: tableWidgets?.[field] as WidgetStructure };
	}
	return baseInputs;
}

function updateField(updatedValue: unknown, field: string) {
	tableRowFieldsShown.value[field] = updatedValue;
}

function updateComparatorFromComponent(comparator: string, field: string) {
	tableRowFieldsComparator.value[field] = comparator;
}

async function addFilter(option: AutocompleteOption<string>) {
	const key = option.value;
	tableRowFieldsShown.value = { ...tableRowFieldsShown.value, [key]: undefined };
	tableRowFieldsComparator.value = {
		...tableRowFieldsComparator.value,
		[key]: tableRowFieldsComparator.value[key] || 'eq',
	};
	// UiAutocomplete sets the text to the picked label after `select`; clear it once that lands.
	await nextTick();
	fieldSearch.value = '';
}

function removeFilter(field: string) {
	delete tableRowFieldsShown.value[field];
	delete tableRowFieldsComparator.value[field];
}

function resetFilters() {
	tableFilters.value = [];
	tableRowFieldsShown.value = {};
	dialogRef.close({ action: 'reset', filters: {}, comparators: { ...tableRowFieldsComparator.value } });
}

function applyFilters() {
	track('Filters: filter is clicked');
	dialogRef.close({
		action: 'filter',
		filters: { ...tableRowFieldsShown.value },
		comparators: { ...tableRowFieldsComparator.value },
	});
}

function onCancel() {
	track('Filters: cancel is clicked');
}

/** Focuses the control of `fieldName` once the widgets have rendered (the Angular selector chain). */
function focusOnField(fieldName: string) {
	const line = root.value?.querySelector(`[data-field="${CSS.escape(fieldName)}"]`);
	const control = line?.querySelector<HTMLElement>('input, textarea, select');
	if (!control || control === document.activeElement) return;
	control.focus();
	control.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
}

function track(action: string) {
	trackEvent(action);
	posthog.capture(action);
}

function firstQueryValue(value: unknown): string | undefined {
	const first = Array.isArray(value) ? value[0] : value;
	return typeof first === 'string' && first ? first : undefined;
}

function parseFilters(value: string | undefined): FiltersByField {
	if (!value) return {};
	try {
		const parsed = JsonURL.parse(value);
		return parsed && typeof parsed === 'object' ? (parsed as FiltersByField) : {};
	} catch {
		return {};
	}
}

function definedComparators(comparators: Record<string, string | undefined>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(comparators).filter((entry): entry is [string, string] => entry[1] !== undefined),
	);
}
</script>

<template>
	<AppDialogForm
		title="Filters"
		submit-label="Filter"
		size="lg"
		:disabled="tableFiltersCount === 0"
		@submit="applyFilters"
		@cancel="onCancel"
	>
		<div ref="root" class="table-filters">
			<div class="table-filters__table">
				<span>Table: {{ data.displayTableName }}</span>
				<UiIconButton
					icon="settings"
					label="Advanced settings"
					size="sm"
					:to="`/dashboard/${data.connectionID}/${data.tableName}/settings`"
					@click="dialogRef.close()"
				/>
			</div>

			<UiField label="Add filter by..." class="table-filters__select">
				<UiAutocomplete
					v-model="fieldSearch"
					:options="foundFields"
					name="filter_columns"
					auto-active-first
					@select="addFilter"
				/>
			</UiField>

			<div v-for="key in shownKeys" :key="key" class="table-filters__line" :data-field="key">
				<span class="table-filters__column">{{ getFieldLabel(key) }}</span>
				<div class="table-filters__field">
					<component
						:is="getFilterComponent(key)"
						v-if="getFilterComponent(key)"
						v-bind="getFilterInputs(key)"
						@field-change="(value: unknown) => updateField(value, key)"
						@comparator-change="(comparator: string) => updateComparatorFromComponent(comparator, key)"
					/>
				</div>
				<UiIconButton icon="close" label="Remove" size="sm" class="table-filters__remove" @click="removeFilter(key)" />
			</div>
		</div>

		<template #actions>
			<UiButton variant="danger" class="table-filters__reset" :disabled="tableFilters.length === 0" @click="resetFilters">
				Reset
			</UiButton>
		</template>
	</AppDialogForm>
</template>

<style scoped>
.table-filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.table-filters__table {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: calc(-1 * var(--space-2));
  font-size: var(--text-sm);
  color: var(--color-muted);
}

.table-filters__line {
  display: grid;
  grid-template-columns: minmax(6rem, 10rem) minmax(0, 1fr) auto;
  align-items: start;
  gap: var(--space-3);
}

.table-filters__column {
  padding-top: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink);
  overflow-wrap: anywhere;
}

.table-filters__field {
  min-width: 0;
}

.table-filters__reset {
  margin-inline-end: auto;
}

@media (width <= 600px) {
  .table-filters__line {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .table-filters__column {
    grid-column: 1 / -1;
    padding-top: 0;
  }
}
</style>
