<script setup lang="ts">
/**
 * Port of saved-filters-panel/saved-filters-dialog: creates or edits a saved ("fast") filter — a
 * name, conditions (one card per column: comparator + value widget), and optionally one
 * "quick editing" column whose value is typed from the table view instead of being saved.
 *
 * Opened by SavedFiltersPanel with `useDialog().open(SavedFiltersDialog, { data })`. Closes with
 * `true` once the filter is created, updated or removed (the tables store announces it through
 * `tableEvents`, which the panel listens to); Cancel and Escape close with `undefined`. Errors are
 * shown by the store and leave the dialog open.
 */
import posthog from 'posthog-js';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import {
	type AutocompleteOption,
	UiAutocomplete,
	UiButton,
	UiField,
	UiIcon,
	UiIconButton,
	UiInput,
	UiSelect,
	UiSwitch,
	vTooltip,
} from '@/components/ui';
import { trackEvent } from '@/composables/useAnalytics';
import { useDialogRef } from '@/composables/useDialog';
import { getTableTypes } from '@/lib/setup-table-row-structure';
import type { TableField, WidgetStructure } from '@/models/table';
import { useConnectionsStore } from '@/stores/connections';
import { useTablesStore } from '@/stores/tables';
import {
	buildSavedFilterPayload,
	hasConditions,
	NUMBER_COMPARATOR_OPTIONS,
	readFiltersSet,
	type SavedFilterSet,
	TEXT_COMPARATOR_OPTIONS,
} from './SavedFiltersDialog.helpers';
import {
	columnFilterComponent,
	type FilterWidgetContext,
	type ForeignKeysByField,
	filterInputsFor,
	getFieldComparatorFamily,
	getInputType,
	isWidget,
	resolveFilterComponent,
	structureByField,
	type WidgetsByField,
} from './TableFiltersDialog.helpers';

export interface SavedFiltersDialogData {
	connectionID: string;
	tableName: string;
	displayTableName: string;
	structure: TableField[];
	tableForeignKeys: ForeignKeysByField;
	/** The table view's widgets keyed by column, `widget_params` parsed. */
	tableWidgets: WidgetsByField | null | undefined;
	/** The filter to edit, or `{ name: '', filters: {} }` for a new one. */
	filtersSet: SavedFilterSet;
}

const props = defineProps<{
	data: SavedFiltersDialogData;
}>();

const dialogRef = useDialogRef<boolean>();
const tables = useTablesStore();
const connections = useConnectionsStore();

const initial = readFiltersSet(props.data.filtersSet);
const name = ref(props.data.filtersSet?.name ?? '');
const tableRowFieldsShown = ref<Record<string, unknown>>(initial.values);
const tableRowFieldsComparator = ref<Record<string, string | undefined>>(initial.comparators);
const dynamicColumn = ref<string | null>(initial.dynamicColumn);

const structure = props.data.structure ?? [];
const tableForeignKeys: ForeignKeysByField = props.data.tableForeignKeys ?? {};
const tableTypes: Record<string, string> = getTableTypes(structure, Object.keys(tableForeignKeys));
const tableRowStructure = structureByField(structure);
const tableWidgets: WidgetsByField | undefined =
	props.data.tableWidgets && Object.keys(props.data.tableWidgets).length ? props.data.tableWidgets : undefined;

const ctx = computed<FilterWidgetContext>(() => ({
	widgets: tableWidgets,
	inputs: filterInputsFor(connections.currentConnection.type),
	tableTypes,
}));

const isEditing = computed(() => Boolean(props.data.filtersSet?.id));
const fields = computed(() =>
	structure.filter((field) => getInputType(ctx.value, field.column_name) !== 'file').map((field) => field.column_name),
);

const fieldSearch = ref('');
const foundFields = computed<AutocompleteOption<string>[]>(() => {
	const value = fieldSearch.value.toLowerCase();
	return fields.value
		.filter((field) => field.toLowerCase().includes(value))
		.map((field) => ({ value: field, label: field }));
});

const showAddConditionField = ref(false);
const showNameError = ref(false);
const showConditionsError = ref(false);
const helpOpenFor = ref<string | null>(null);

/** `tableRowFieldsShown | keyvalue`: the pipe orders by key. */
const shownKeys = computed(() => Object.keys(tableRowFieldsShown.value).sort());
const hasSelectedFilters = computed(() => shownKeys.value.length > 0);

const root = ref<HTMLElement | null>(null);
const timers = new Set<ReturnType<typeof setTimeout>>();

onMounted(() => {
	// The dialog focuses its first field; an existing filter is opened to change conditions.
	if (isEditing.value) {
		later(() => {
			const nameInput = nameControl();
			if (nameInput && document.activeElement === nameInput) nameInput.blur();
		}, 100);
	}
});
onBeforeUnmount(() => {
	for (const timer of timers) clearTimeout(timer);
});

function comparatorFamily(field: string) {
	return getFieldComparatorFamily(ctx.value, field);
}

/** The non-comparable card's widget: the column's configured widget, else its type's filter. */
function widgetComponent(field: string) {
	return resolveFilterComponent(ctx.value, field);
}

function widgetInputs(field: string): Record<string, unknown> {
	const relations = tableTypes[field] === 'foreign key' ? tableForeignKeys[field] : undefined;
	if (isWidget(tableWidgets, field)) {
		const widget = tableWidgets?.[field] as WidgetStructure;
		return {
			fieldKey: field,
			label: widget.name || field,
			value: tableRowFieldsShown.value[field],
			widgetStructure: widget,
			relations,
		};
	}
	return {
		fieldKey: field,
		label: field,
		value: tableRowFieldsShown.value[field],
		structure: tableRowStructure[field],
		relations,
	};
}

/** The comparable card's value widget: always the column type's own filter. */
function valueComponent(field: string) {
	return columnFilterComponent(ctx.value, field);
}

function valueInputs(field: string): Record<string, unknown> {
	return {
		fieldKey: field,
		label: field,
		value: tableRowFieldsShown.value[field],
		readonly: tableRowFieldsComparator.value[field] === 'empty',
		structure: tableRowStructure[field],
		relations: tableTypes[field] === 'foreign key' ? tableForeignKeys[field] : undefined,
	};
}

function comparatorOptions(field: string) {
	return comparatorFamily(field) === 'text' ? TEXT_COMPARATOR_OPTIONS : NUMBER_COMPARATOR_OPTIONS;
}

function handleAddConditionButtonClick() {
	showAddConditionField.value = true;
	later(() => conditionControl()?.focus(), 0);
}

function cancelAddConditionInput() {
	showAddConditionField.value = false;
	fieldSearch.value = '';
}

function updateComparatorFromComponent(comparator: string, field: string) {
	tableRowFieldsComparator.value[field] = comparator;
}

function updateField(updatedValue: unknown, field: string) {
	tableRowFieldsShown.value[field] = updatedValue;
	if (showConditionsError.value && hasSelectedFilters.value) showConditionsError.value = false;
}

async function addFilter(option: AutocompleteOption<string>) {
	const key = option.value;
	tableRowFieldsShown.value = { ...tableRowFieldsShown.value, [key]: undefined };
	tableRowFieldsComparator.value = {
		...tableRowFieldsComparator.value,
		[key]: tableRowFieldsComparator.value[key] || 'eq',
	};
	showConditionsError.value = false;
	if (hasSelectedFilters.value) showAddConditionField.value = false;
	// UiAutocomplete sets the text to the picked label after `select`; clear it once that lands.
	await nextTick();
	fieldSearch.value = '';
}

function handleInputBlur() {
	if (fieldSearch.value.trim() !== '') return;
	later(() => {
		if (fieldSearch.value.trim() === '') cancelAddConditionInput();
	}, 200);
}

function onComparatorSelect(comparator: string | null, field: string) {
	tableRowFieldsComparator.value[field] = comparator ?? undefined;
	if (comparator === 'empty') tableRowFieldsShown.value[field] = '';
}

function removeFilter(field: string) {
	delete tableRowFieldsShown.value[field];
	delete tableRowFieldsComparator.value[field];
	if (dynamicColumn.value === field) dynamicColumn.value = null;
	showConditionsError.value = false;
	if (!hasSelectedFilters.value) showAddConditionField.value = false;
}

function toggleDynamicColumn(field: string) {
	dynamicColumn.value = dynamicColumn.value === field ? null : field;
}

function toggleHelp(field: string) {
	helpOpenFor.value = helpOpenFor.value === field ? null : field;
}

async function removeFilters() {
	const id = props.data.filtersSet.id;
	if (!id) return;
	try {
		await tables.deleteSavedFilter(props.data.connectionID, props.data.tableName, id);
		dialogRef.close(true);
	} catch {
		// Reported by the store.
	}
}

async function handleSaveFilters() {
	showNameError.value = false;
	showConditionsError.value = false;

	if (!name.value || name.value.trim() === '') {
		showNameError.value = true;
		later(() => {
			const nameInput = nameControl();
			nameInput?.focus();
			nameInput?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
		}, 0);
		return;
	}

	const state = {
		values: tableRowFieldsShown.value,
		comparators: tableRowFieldsComparator.value,
		dynamicColumn: dynamicColumn.value,
	};
	if (!hasConditions(state)) {
		showConditionsError.value = true;
		later(() => {
			const control = conditionControl() ?? root.value?.querySelector<HTMLElement>('.saved-filters-dialog__add button');
			control?.focus();
			control?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
		}, 0);
		return;
	}

	const payload = buildSavedFilterPayload(name.value, state);
	if (!payload) return;

	const { connectionID, tableName, filtersSet } = props.data;
	try {
		if (filtersSet.id) {
			await tables.updateSavedFilter(connectionID, tableName, filtersSet.id, payload);
		} else {
			await tables.createSavedFilter(connectionID, tableName, payload);
			trackEvent('Saved filters: saved filter is created successfully');
			posthog.capture('Saved filters: saved filter is created successfully');
		}
		dialogRef.close(true);
	} catch {
		// Reported by the store.
	}
}

function nameControl() {
	return root.value?.querySelector<HTMLInputElement>('input[name="filters_set_name"]') ?? null;
}

function conditionControl() {
	return root.value?.querySelector<HTMLInputElement>('input[name="filter_columns"]') ?? null;
}

function later(fn: () => void, delay: number) {
	const timer = setTimeout(() => {
		timers.delete(timer);
		fn();
	}, delay);
	timers.add(timer);
}
</script>

<template>
	<AppDialogForm
		:title="isEditing ? 'Edit fast filter' : 'New fast filter'"
		submit-label="Save filter"
		size="lg"
		@submit="handleSaveFilters"
	>
		<div ref="root" class="saved-filters-dialog">
			<p class="saved-filters-dialog__table">Table: {{ data.displayTableName }}</p>
			<p class="saved-filters-dialog__description">
				Use conditions to quickly filter {{ data.displayTableName.toLowerCase() }} and optionally edit one column.
			</p>

			<UiField
				label="Fast filter name"
				required
				:error="showNameError ? 'Fast filter name is required' : undefined"
			>
				<UiInput v-model="name" name="filters_set_name" @update:model-value="showNameError = false" />
			</UiField>

			<div class="saved-filters-dialog__where">
				<UiIcon name="subdirectory_arrow_right" size="sm" />
				<span>where</span>
			</div>

			<div v-for="key in shownKeys" :key="key" class="condition-card" :data-field="key">
				<div class="condition-card__header">
					<span class="condition-card__column-name">{{ key }}</span>
					<UiIconButton icon="close" label="Remove" size="sm" @click="removeFilter(key)" />
				</div>

				<div class="condition-card__inputs">
					<template v-if="comparatorFamily(key) === 'nonComparable'">
						<component
							:is="widgetComponent(key)"
							v-if="widgetComponent(key)"
							class="condition-card__value"
							v-bind="widgetInputs(key)"
							@field-change="(value: unknown) => updateField(value, key)"
							@comparator-change="(comparator: string) => updateComparatorFromComponent(comparator, key)"
						/>
					</template>
					<template v-else>
						<UiSelect
							class="condition-card__comparator"
							:model-value="tableRowFieldsComparator[key] ?? null"
							:options="comparatorOptions(key)"
							size="sm"
							:name="`${comparatorFamily(key)}Comparator-${key}`"
							:aria-label="`${key} comparator`"
							data-testid="saved-filter-comparator"
							@update:model-value="(comparator) => onComparatorSelect(comparator as string | null, key)"
						/>
						<div class="condition-card__value">
							<component
								:is="valueComponent(key)"
								v-if="valueComponent(key)"
								v-bind="valueInputs(key)"
								@field-change="(value: unknown) => updateField(value, key)"
								@comparator-change="(comparator: string) => updateComparatorFromComponent(comparator, key)"
							/>
						</div>
					</template>
				</div>

				<div class="condition-card__footer">
					<span class="condition-card__editable-label">Quick editing</span>
					<UiIconButton
						icon="info"
						label="What is quick editing?"
						size="sm"
						:aria-expanded="helpOpenFor === key ? 'true' : 'false'"
						@click="toggleHelp(key)"
					/>
					<span
						v-tooltip.top="dynamicColumn === key ? 'Disable editing' : 'Enable editing'"
						class="condition-card__editable-toggle"
					>
						<UiSwitch
							:model-value="dynamicColumn === key"
							size="sm"
							:aria-label="`Quick editing of ${key}`"
							@update:model-value="toggleDynamicColumn(key)"
						/>
					</span>
				</div>
				<div v-if="helpOpenFor === key" class="quick-edit-help" role="note">
					<p class="quick-edit-help__text">Enable to change this value<br>directly from the table view</p>
					<div class="quick-edit-help__example" aria-hidden="true">
						<div class="quick-edit-help__track"><div class="quick-edit-help__thumb" /></div>
						<div class="quick-edit-help__filter">
							<div class="quick-edit-help__chip">status = active</div>
							<div class="quick-edit-help__editable">
								<span class="quick-edit-help__editable-label">status:</span>
								<span class="quick-edit-help__editable-value">
									<span class="quick-edit-help__typing" />
									<span class="quick-edit-help__cursor">|</span>
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="saved-filters-dialog__add">
				<UiButton v-if="!showAddConditionField" variant="secondary" @click="handleAddConditionButtonClick">
					<template #leading><UiIcon name="add" size="sm" /></template>
					Add condition
				</UiButton>
				<UiField
					v-else
					label="Click here to add condition"
					:error="showConditionsError ? 'At least one condition is required' : undefined"
				>
					<UiAutocomplete
						v-model="fieldSearch"
						:options="foundFields"
						name="filter_columns"
						auto-active-first
						@select="addFilter"
						@blur="handleInputBlur"
						@input="showConditionsError = false"
					>
						<template v-if="hasSelectedFilters" #trailing>
							<UiIconButton icon="close" label="Cancel adding condition" size="sm" @click="cancelAddConditionInput" />
						</template>
					</UiAutocomplete>
				</UiField>
				<p v-if="showConditionsError && !showAddConditionField" class="saved-filters-dialog__error" role="alert">
					At least one condition is required
				</p>
			</div>
		</div>

		<template #actions>
			<UiButton v-if="isEditing" variant="danger" class="saved-filters-dialog__remove" @click="removeFilters">
				Remove
			</UiButton>
		</template>
	</AppDialogForm>
</template>

<style scoped>
.saved-filters-dialog {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.saved-filters-dialog__table {
  margin: calc(-1 * var(--space-2)) 0 0;
  font-size: var(--text-sm);
  color: var(--color-muted);
}

.saved-filters-dialog__description {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-ink-soft);
}

.saved-filters-dialog__where {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  color: var(--color-muted);
}

.saved-filters-dialog__add {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

.saved-filters-dialog__add > :deep(.ui-field) {
  width: 100%;
}

.saved-filters-dialog__error {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-danger);
}

.saved-filters-dialog__remove {
  margin-inline-end: auto;
}

.condition-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) 0;
  border-bottom: 1px dashed var(--color-line);
}

.condition-card:last-of-type {
  border-bottom: none;
}

.condition-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.condition-card__column-name {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-muted);
}

.condition-card__inputs {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--space-1);
}

.condition-card__comparator {
  flex: 0 0 auto;
}

.condition-card__value {
  flex: 1 1 0;
  min-width: 0;
}

.condition-card__footer {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.condition-card__editable-label {
  font-size: var(--text-xs);
  color: var(--color-muted);
}

.condition-card__editable-toggle {
  display: inline-flex;
  align-items: center;
}

/* The animated "quick editing" example: the toggle switches on, the chip turns into an input. */
.quick-edit-help {
  padding: var(--space-4);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  box-shadow: var(--shadow-card);
  align-self: flex-start;
}

.quick-edit-help__text {
  margin: 0 0 var(--space-3);
  font-size: var(--text-xs);
  line-height: var(--leading-snug);
  color: var(--color-ink-soft);
}

.quick-edit-help__example {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.quick-edit-help__track {
  position: relative;
  flex-shrink: 0;
  width: 2.25rem;
  height: 1.25rem;
  border-radius: var(--radius-pill);
  background-color: var(--color-line-strong);
  animation: quick-edit-track 3s ease-in-out infinite;
}

.quick-edit-help__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background-color: var(--color-surface);
  box-shadow: var(--shadow-card);
  animation: quick-edit-thumb 3s ease-in-out infinite;
}

.quick-edit-help__filter {
  position: relative;
  height: 2.25rem;
  min-width: 7rem;
  margin-top: var(--space-1);
}

.quick-edit-help__chip {
  position: absolute;
  inset: 0 auto auto 0;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  background-color: var(--color-paper-2);
  font-size: var(--text-xs);
  color: var(--color-ink-soft);
  white-space: nowrap;
  animation: quick-edit-chip 3s ease-in-out infinite;
}

.quick-edit-help__editable {
  position: absolute;
  inset: 0 auto auto 0;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-2) var(--space-1);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-control);
  opacity: 0;
  animation: quick-edit-editable 3s ease-in-out infinite;
}

.quick-edit-help__editable-label {
  position: absolute;
  top: -0.5rem;
  left: var(--space-2);
  padding: 0 var(--space-1);
  font-size: var(--text-2xs);
  color: var(--color-accent);
  background-color: var(--color-surface-raised);
}

.quick-edit-help__editable-value {
  display: flex;
  align-items: center;
  font-size: var(--text-xs);
  color: var(--color-ink);
}

.quick-edit-help__typing::after {
  content: "active";
  animation: quick-edit-type 3s ease-in-out infinite;
}

.quick-edit-help__cursor {
  font-size: var(--text-xs);
  color: var(--color-accent);
  animation: quick-edit-cursor 0.5s step-end infinite;
}

@keyframes quick-edit-track {
  0%, 40%, 100% { background-color: var(--color-line-strong); }
  50%, 90% { background-color: var(--color-accent); }
}

@keyframes quick-edit-thumb {
  0%, 40%, 100% { left: 2px; }
  50%, 90% { left: 18px; }
}

@keyframes quick-edit-chip {
  0%, 40%, 100% { opacity: 1; }
  50%, 90% { opacity: 0; }
}

@keyframes quick-edit-editable {
  0%, 40%, 100% { opacity: 0; }
  50%, 90% { opacity: 1; }
}

@keyframes quick-edit-type {
  0%, 40%, 100% { content: ""; }
  45% { content: "p"; }
  50% { content: "pe"; }
  55% { content: "pen"; }
  60% { content: "pend"; }
  65% { content: "pendi"; }
  70%, 90% { content: "pending"; }
}

@keyframes quick-edit-cursor {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .quick-edit-help__track,
  .quick-edit-help__thumb,
  .quick-edit-help__chip,
  .quick-edit-help__editable,
  .quick-edit-help__typing::after,
  .quick-edit-help__cursor {
    animation: none;
  }
}
</style>
