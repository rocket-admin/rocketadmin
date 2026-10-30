<script setup lang="ts">
/**
 * Port of filter-fields/foreign-key (`ForeignKeyFilterComponent`): an autocomplete over the
 * referenced table's rows, with a link to the selected related record.
 *
 * On setup it loads the row the current value points at (its display string and link, and emits
 * the referenced value) and the first 20 suggestions. Typing is debounced 500 ms: text matching a
 * known suggestion emits that suggestion's value, anything else searches the referenced table.
 * Clearing the text emits `null`. Suggestions read "identity (col | col)", or the autocomplete
 * columns (else every non-empty column) joined by " | ".
 */
import { computed, onBeforeUnmount, ref } from 'vue';
import { type LocationQueryRaw, RouterLink } from 'vue-router';
import { type AutocompleteOption, UiAutocomplete, UiField, UiIcon } from '@/components/ui';
import { useConnectionsStore } from '@/stores/connections';
import { useTablesStore } from '@/stores/tables';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import { type FocusTarget, useAutofocus } from './useAutofocus';

interface FetchTableResponse {
	rows: Record<string, unknown>[];
	primaryColumns: { column_name: string; data_type: string }[];
	identity_column?: string;
}

interface ForeignKeySuggestion {
	displayString: string;
	primaryKeys?: Record<string, unknown>;
	fieldValue?: unknown;
}

const SEARCH_DEBOUNCE = 500;

const props = defineProps<FilterFieldProps & { value?: string | number | null }>();
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel } = useFilterField(props);
const tables = useTablesStore();
const connections = useConnectionsStore();

const input = ref<FocusTarget>(null);
useAutofocus(props, input);

const connectionID = connections.connectionID ?? '';
const currentDisplayedString = ref('');
const currentFieldValue = ref<unknown>();
const currentFieldQueryParams = ref<Record<string, unknown>>({});
const suggestions = ref<ForeignKeySuggestion[]>([]);
const fetching = ref(true);
let identityColumn: string | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

const options = ref<AutocompleteOption<ForeignKeySuggestion>[]>([]);

/** The related row's primary key(s), as the link's query string. */
const linkQuery = computed<LocationQueryRaw>(() =>
	Object.fromEntries(
		Object.entries(currentFieldQueryParams.value).map(([key, value]) => [key, value == null ? null : String(value)]),
	),
);

loadInitial();

onBeforeUnmount(() => clearTimeout(debounceTimer));

function onSearchInput(text: string) {
	currentDisplayedString.value = text;
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => {
		if (currentDisplayedString.value === '') emit('fieldChange', null);
		fetchSuggestions();
	}, SEARCH_DEBOUNCE);
}

/** `optionSelected` → `updateRelatedLink`: point the link at the picked row. */
function onSelect(option: AutocompleteOption<ForeignKeySuggestion>) {
	currentFieldQueryParams.value = option.value.primaryKeys ?? {};
}

async function fetchSuggestions(): Promise<void> {
	const rels = props.relations;
	const currentRow = suggestions.value.find((suggestion) => suggestion.displayString === currentDisplayedString.value);
	if (currentRow !== undefined) {
		currentFieldValue.value = currentRow.fieldValue;
		emit('fieldChange', currentFieldValue.value);
		return;
	}
	if (!rels) return;
	fetching.value = true;
	try {
		const res = await tables.fetchTable<FetchTableResponse>({
			connectionID,
			tableName: rels.referenced_table_name,
			requstedPage: 1,
			chunkSize: 20,
			foreignKeyRowName: 'autocomplete',
			foreignKeyRowValue: currentDisplayedString.value,
			referencedColumn: rels.referenced_column_name,
		});
		identityColumn = res?.identity_column;
		if (!res || res.rows.length === 0) {
			setSuggestions([{ displayString: `No field starts with "${currentDisplayedString.value}" in foreign entity.` }]);
		} else {
			setSuggestions(res.rows.map((row) => toSuggestion(row, res)));
		}
	} catch (error) {
		console.error('Error fetching suggestions:', error);
	} finally {
		fetching.value = false;
	}
}

async function loadInitial(): Promise<void> {
	const rels = props.relations;
	if (!rels) {
		fetching.value = false;
		return;
	}
	try {
		const res = await tables.fetchTable<FetchTableResponse>({
			connectionID,
			tableName: rels.referenced_table_name,
			requstedPage: 1,
			chunkSize: 10,
			foreignKeyRowName: rels.referenced_column_name,
			foreignKeyRowValue: props.value == null ? undefined : String(props.value),
		});

		const first = res?.rows[0];
		if (res && first) {
			identityColumn = res.identity_column;
			if (props.value) {
				currentDisplayedString.value = displayStringOf(first);
				currentFieldValue.value = first[rels.referenced_column_name];
				currentFieldQueryParams.value = primaryKeysOf(first, res);
				emit('fieldChange', currentFieldValue.value);
			}
		}

		const suggestionsRes = await tables.fetchTable<FetchTableResponse>({
			connectionID,
			tableName: rels.referenced_table_name,
			requstedPage: 1,
			chunkSize: 20,
			foreignKeyRowName: 'autocomplete',
			foreignKeyRowValue: '',
			referencedColumn: rels.referenced_column_name,
		});
		identityColumn = suggestionsRes?.identity_column;
		setSuggestions(suggestionsRes ? suggestionsRes.rows.map((row) => toSuggestion(row, suggestionsRes)) : []);
	} catch (error) {
		console.error('Error loading foreign key data:', error);
	} finally {
		fetching.value = false;
	}
}

function setSuggestions(list: ForeignKeySuggestion[]) {
	suggestions.value = list;
	// The "No field starts with …" row has no value to pick, so it is shown disabled.
	options.value = list.map((suggestion) => ({
		value: suggestion,
		label: suggestion.displayString,
		disabled: suggestion.fieldValue === undefined && suggestion.primaryKeys === undefined,
	}));
}

function toSuggestion(row: Record<string, unknown>, res: FetchTableResponse): ForeignKeySuggestion {
	return {
		displayString: displayStringOf(row),
		primaryKeys: primaryKeysOf(row, res),
		fieldValue: row[props.relations?.referenced_column_name ?? ''],
	};
}

function displayStringOf(row: Record<string, unknown>): string {
	const joined = Object.values(getModifiedRow(row))
		.filter((value) => value)
		.join(' | ');
	return identityColumn ? `${row[identityColumn]} (${joined})` : joined;
}

function primaryKeysOf(row: Record<string, unknown>, res: FetchTableResponse): Record<string, unknown> {
	return Object.fromEntries(res.primaryColumns.map((key) => [key.column_name, row[key.column_name]]));
}

/** The autocomplete columns minus the identity column, else every non-empty column. */
function getModifiedRow(row: Record<string, unknown>): Record<string, unknown> {
	const autocompleteColumns = props.relations?.autocomplete_columns;
	if (autocompleteColumns && autocompleteColumns.length > 0) {
		const columns = autocompleteColumns.filter((column) => column !== identityColumn);
		return Object.fromEntries(columns.map((column) => [column, row[column]]));
	}
	return Object.fromEntries(Object.entries(row).filter(([, value]) => value));
}
</script>

<template>
	<div class="foreign-key-filter">
		<UiField floating-label :label="normalizedLabel" :required="required">
			<UiAutocomplete
				ref="input"
				:model-value="currentDisplayedString"
				:options="options"
				:loading="fetching"
				auto-active-first
				:disabled="disabled"
				:readonly="readonly"
				@update:model-value="onSearchInput"
				@select="onSelect"
			/>
		</UiField>
		<RouterLink
			v-if="relations"
			class="foreign-key-filter__link"
			:to="{
				path: `/dashboard/${connectionID}/${relations.referenced_table_name}/entry`,
				query: linkQuery,
			}"
			target="_blank"
			title="Show related record"
			aria-label="Show related record"
		>
			<UiIcon name="open_in_new" size="sm" />
		</RouterLink>
	</div>
</template>

<style scoped>
.foreign-key-filter {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: var(--space-2);
}

.foreign-key-filter__link {
  display: inline-grid;
  place-items: center;
  width: var(--space-8);
  height: var(--space-8);
  margin-block-end: var(--space-1);
  border-radius: var(--radius-control);
  color: var(--color-muted);
}

.foreign-key-filter__link:hover {
  color: var(--color-ink);
  background: var(--color-paper);
}

.foreign-key-filter__link:focus-visible {
  outline: none;
  box-shadow: var(--ring-focus);
}
</style>
