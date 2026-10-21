<script setup lang="ts">
/**
 * Port of record-edit-fields/foreign-key (`ForeignKeyEditComponent`): a foreign-key column picked
 * from rows of the referenced table.
 *
 * On mount the current row is fetched (to show it as text, not as a bare id) and then the first 20
 * suggestions. Typing searches the referenced table server-side, debounced by 500 ms; when the text
 * equals a suggestion, that row's referenced column is emitted. Clearing the text emits `null`. A
 * nullable column (or `widget_params.allow_null`) gets a "— empty" option that emits `null`.
 *
 * The relation comes from the widget params when a Foreign_key widget is configured, otherwise from
 * the table's `relations`.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { type AutocompleteOption, UiAutocomplete, UiField, UiIcon } from '@/components/ui';
import type { TableForeignKey } from '@/models/table';
import { useConnectionsStore } from '@/stores/connections';
import { useTablesStore } from '@/stores/tables';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

interface FetchTableResponse {
	rows: Record<string, unknown>[];
	primaryColumns?: { column_name: string; data_type: string }[];
	identity_column?: string;
}

interface ForeignKeySuggestion {
	displayString: string;
	primaryKeys?: Record<string, unknown>;
	fieldValue?: unknown;
	isNullOption?: boolean;
}

const NULL_OPTION_LABEL = '— empty';
const NULL_SUGGESTION: ForeignKeySuggestion = {
	displayString: NULL_OPTION_LABEL,
	fieldValue: null,
	isNullOption: true,
};
const SEARCH_DEBOUNCE_MS = 500;

/** Whatever type the referenced column has. */
const props = defineProps<RecordEditFieldProps & { value?: unknown }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);
const connections = useConnectionsStore();
const tables = useTablesStore();

const text = ref('');
const currentFieldValue = ref<unknown>(undefined);
const currentFieldQueryParams = ref<Record<string, unknown> | undefined>(undefined);
const suggestions = ref<ForeignKeySuggestion[]>([]);
const fetching = ref(true);
const identityColumn = ref<string | undefined>(undefined);
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

const fkRelations = computed<TableForeignKey | null>(() => {
	const params = widgetParams.value;
	if (params.referenced_table_name) return params as TableForeignKey;
	return props.relations ?? null;
});

const allowsNull = computed(() => Boolean(widgetParams.value.allow_null || props.structure?.allow_null));

const options = computed<AutocompleteOption<ForeignKeySuggestion>[]>(() =>
	suggestions.value.map((suggestion) => ({
		value: suggestion,
		label: suggestion.displayString,
		// The "No field starts with …" row carries no value; picking it would emit `undefined`.
		disabled: !suggestion.isNullOption && !('fieldValue' in suggestion),
	})),
);

const tableName = computed(() => fkRelations.value?.referenced_table_name ?? '');
const settingsLink = computed(() => `/dashboard/${connections.connectionID}/${tableName.value}/settings`);
const entryLink = computed(() => ({
	path: `/dashboard/${connections.connectionID}/${tableName.value}/entry`,
	query: toQuery(currentFieldQueryParams.value),
}));

onMounted(loadInitial);
onBeforeUnmount(() => clearTimeout(debounceTimer));

function onSearchInput(value: string) {
	text.value = value;
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => {
		if (text.value === '') emit('fieldChange', null);
		fetchSuggestions();
	}, SEARCH_DEBOUNCE_MS);
}

/** Angular's `updateRelatedLink`: point the "Show related record" link at the picked row. */
function onSelect(option: AutocompleteOption<ForeignKeySuggestion>) {
	const selected = option.value;
	if (selected.isNullOption) {
		currentFieldValue.value = null;
		currentFieldQueryParams.value = undefined;
		emit('fieldChange', null);
		return;
	}
	currentFieldQueryParams.value = selected.primaryKeys;
}

async function fetchSuggestions(): Promise<void> {
	const currentRow = suggestions.value.find((suggestion) => suggestion.displayString === text.value);
	if (currentRow !== undefined) {
		currentFieldValue.value = currentRow.fieldValue;
		emit('fieldChange', currentFieldValue.value);
		return;
	}
	const relation = fkRelations.value;
	if (!relation) return;
	fetching.value = true;
	try {
		const res = await fetchRows({
			chunkSize: 20,
			foreignKeyRowName: 'autocomplete',
			foreignKeyRowValue: text.value,
			referencedColumn: relation.referenced_column_name,
		});
		identityColumn.value = res.identity_column;
		suggestions.value = withNullOption(
			res.rows.length === 0
				? [{ displayString: `No field starts with "${text.value}" in foreign entity.` }]
				: res.rows.map((row) => toSuggestion(row, res)),
		);
	} catch (error) {
		console.error('Error fetching suggestions:', error);
	} finally {
		fetching.value = false;
	}
}

async function loadInitial(): Promise<void> {
	const relation = fkRelations.value;
	if (!relation) return;
	try {
		const res = await fetchRows({
			chunkSize: 10,
			foreignKeyRowName: relation.referenced_column_name,
			foreignKeyRowValue: props.value,
		});
		const row = res.rows[0];
		if (row) {
			identityColumn.value = res.identity_column;
			if (props.value) {
				text.value = displayString(row);
				currentFieldValue.value = row[relation.referenced_column_name];
				currentFieldQueryParams.value = primaryKeysOf(row, res);
			}
		}

		const suggestionsRes = await fetchRows({
			chunkSize: 20,
			foreignKeyRowName: 'autocomplete',
			foreignKeyRowValue: '',
			referencedColumn: relation.referenced_column_name,
		});
		identityColumn.value = suggestionsRes.identity_column;
		suggestions.value = withNullOption(suggestionsRes.rows.map((r) => toSuggestion(r, suggestionsRes)));
	} catch (error) {
		console.error('Error loading foreign key data:', error);
	} finally {
		fetching.value = false;
	}
}

async function fetchRows(params: {
	chunkSize: number;
	foreignKeyRowName: string;
	foreignKeyRowValue: unknown;
	referencedColumn?: string;
}): Promise<FetchTableResponse> {
	const res = await tables.fetchTable<FetchTableResponse>({
		connectionID: connections.connectionID ?? '',
		tableName: tableName.value,
		requstedPage: 1,
		chunkSize: params.chunkSize,
		foreignKeyRowName: params.foreignKeyRowName,
		foreignKeyRowValue: params.foreignKeyRowValue == null ? undefined : String(params.foreignKeyRowValue),
		...(params.referencedColumn !== undefined ? { referencedColumn: params.referencedColumn } : {}),
	});
	return { rows: res?.rows ?? [], primaryColumns: res?.primaryColumns ?? [], identity_column: res?.identity_column };
}

function toSuggestion(row: Record<string, unknown>, res: FetchTableResponse): ForeignKeySuggestion {
	return {
		displayString: displayString(row),
		primaryKeys: primaryKeysOf(row, res),
		fieldValue: row[fkRelations.value?.referenced_column_name ?? ''],
	};
}

/** `identity (a | b)` with an identity column, otherwise `a | b | c`; empty values are skipped. */
function displayString(row: Record<string, unknown>): string {
	const rest = Object.values(modifiedRow(row))
		.filter((value) => value)
		.join(' | ');
	return identityColumn.value ? `${row[identityColumn.value]} (${rest})` : rest;
}

/** Angular's `getModifiedRow`: the autocomplete columns minus the identity column, or every non-empty column. */
function modifiedRow(row: Record<string, unknown>): Record<string, unknown> {
	const autocompleteColumns = fkRelations.value?.autocomplete_columns;
	if (autocompleteColumns && autocompleteColumns.length > 0) {
		return Object.fromEntries(
			autocompleteColumns.filter((column) => column !== identityColumn.value).map((column) => [column, row[column]]),
		);
	}
	return Object.fromEntries(Object.entries(row).filter(([, value]) => value));
}

function primaryKeysOf(row: Record<string, unknown>, res: FetchTableResponse): Record<string, unknown> {
	return Object.fromEntries((res.primaryColumns ?? []).map((key) => [key.column_name, row[key.column_name]]));
}

function withNullOption(list: ForeignKeySuggestion[]): ForeignKeySuggestion[] {
	return allowsNull.value ? [...list, NULL_SUGGESTION] : list;
}

function toQuery(params: Record<string, unknown> | undefined): Record<string, string> {
	return Object.fromEntries(Object.entries(params ?? {}).map(([key, value]) => [key, String(value)]));
}
</script>

<template>
	<div class="foreign-key-edit">
		<UiField class="foreign-key-edit__field" :label="normalizedLabel" :required="required">
			<UiAutocomplete
				:model-value="text"
				:options="options"
				:loading="fetching"
				auto-active-first
				:disabled="disabled"
				:readonly="readonly"
				:data-testid="`record-${label}-foreign-key`"
				@update:model-value="onSearchInput"
				@select="onSelect"
			>
				<template #option="{ option }">
					<span :class="{ 'foreign-key-edit__null-option': option.value.isNullOption }">{{ option.label }}</span>
				</template>
			</UiAutocomplete>
			<p class="foreign-key-edit__hint">
				Improve search performance by configuring <em>Searchable foreign key columns</em>
				<RouterLink :to="settingsLink" class="foreign-key-edit__hint-link">here</RouterLink>
			</p>
		</UiField>
		<RouterLink
			v-if="currentFieldValue != null"
			class="foreign-key-edit__link"
			:to="entryLink"
			target="_blank"
			title="Show related record"
			aria-label="Show related record"
		>
			<UiIcon name="open_in_new" />
		</RouterLink>
	</div>
</template>

<style scoped>
.foreign-key-edit {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
  gap: var(--space-2);
}

.foreign-key-edit__field {
  grid-column: 1;
}

.foreign-key-edit__hint {
  margin: 0;
  font-size: var(--text-xs);
  line-height: var(--leading-normal);
  color: var(--color-muted-soft);
}

.foreign-key-edit__hint-link {
  color: var(--color-accent);
}

.foreign-key-edit__null-option {
  font-style: italic;
  color: var(--color-muted);
}

/* Lines the icon up with the control, below the label. */
.foreign-key-edit__link {
  grid-column: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: var(--space-8);
  padding: var(--space-1);
  border-radius: var(--radius-control);
  color: var(--color-ink-soft);
}

.foreign-key-edit__link:hover {
  color: var(--color-accent);
}
</style>
