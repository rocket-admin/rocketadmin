<script setup lang="ts">
// Port of frontend/src/app/components/dashboard/db-table-view/db-table-settings: the table's
// settings (`/dashboard/:connectionId/:tableName/settings`) — display name and icon, sensitive and
// identity fields, CSV import/export and delete permissions, the default table view (visible
// columns, column order by drag and drop, search, ordering, sorting, hidden columns) and the row
// edit behaviour (foreign key search columns, read-only fields).
//
// Save is enabled once the form was touched (or the order / icon changed), like Angular's
// `pristine` check; Reset deletes the saved settings.
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import draggable from 'vuedraggable';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppBreadcrumbs from '@/components/shared/AppBreadcrumbs.vue';
import AppIconPicker from '@/components/shared/AppIconPicker.vue';
import PlaceholderTableSettings from '@/components/skeletons/PlaceholderTableSettings.vue';
import { trackTableEvent } from '@/components/table/analytics';
import {
	type SelectOption,
	UiButton,
	UiExpansionPanel,
	UiField,
	UiIcon,
	UiIconButton,
	UiInput,
	UiRadio,
	UiRadioGroup,
	UiSelect,
	UiSwitch,
} from '@/components/ui';
import { normalizeTableName } from '@/lib/normalize';
import { TableOrdering, type TableSettings } from '@/models/table';
import { useConnectionsStore } from '@/stores/connections';
import { type TableStructureResponse, useTablesStore } from '@/stores/tables';

const route = useRoute();
const router = useRouter();
const connections = useConnectionsStore();
const tables = useTablesStore();

const connectionId = computed(() => String(route.params.connectionId ?? ''));
const tableName = computed(() => String(route.params.tableName ?? ''));
const displayTableName = computed(() => normalizeTableName(tableName.value));

const TABLE_SETTINGS_INITIAL: TableSettings = {
	connection_id: '',
	table_name: '',
	icon: '',
	display_name: '',
	autocomplete_columns: [],
	identity_column: '',
	ordering: TableOrdering.Ascending,
	ordering_field: '',
	list_fields: [],
	columns_view: [],
	search_fields: [],
	excluded_fields: [],
	readonly_fields: [],
	sortable_by: [],
	sensitive_fields: [],
	allow_csv_export: true,
	allow_csv_import: true,
	can_delete: true,
};

const defaultIcons = [
	'favorite',
	'star',
	'done',
	'arrow_forward',
	'key',
	'lock',
	'visibility',
	'language',
	'notifications',
	'schedule',
];

// Hints quoting page names, kept here rather than in attribute strings.
const HINTS = {
	sensitive: 'Choose the fields you want hidden in the "Audit" tab. They won\'t be logged on our servers.',
	excluded:
		'Choose the columns you want to hide from the "Table" view and the "Edit row" view. This also removes the option to edit them.',
	readonly: 'Choose columns that will be visible in "Table" view but not editable in "Edit row" view.',
};

const loading = ref(true);
const submitting = ref(false);
const isSettingsExist = ref(false);
const fields = ref<string[]>([]);
const fieldsToExclude = ref<string[]>([]);
const tableSettings = ref<TableSettings | null>(null);
const listFieldsOrder = ref<string[]>([]);
const orderChanged = ref(false);
const iconChanged = ref(false);
/** Any control was changed since load or reset (the inverse of Angular's `form.pristine`). */
const dirty = ref(false);
const form = ref<HTMLFormElement | null>(null);

const fieldOptions = computed<SelectOption<string>[]>(() =>
	fields.value.map((field) => ({ value: field, label: field })),
);
const optionalFieldOptions = computed<SelectOption<string>[]>(() => [
	{ value: '', label: 'None' },
	...fieldOptions.value,
]);
const excludeOptions = computed<SelectOption<string>[]>(() =>
	fieldsToExclude.value.map((field) => ({ value: field, label: field })),
);

const crumbs = computed(() => {
	const connection = connections.currentConnection;
	return [
		{ label: connection.title || connection.database, link: `/dashboard/${connectionId.value}` },
		{
			label: tableSettings.value?.display_name || displayTableName.value,
			link: `/dashboard/${connectionId.value}/${tableName.value}`,
		},
		{ label: 'Settings', link: null },
	];
});

const saveDisabled = computed(() => (submitting.value || !dirty.value) && !orderChanged.value && !iconChanged.value);

onMounted(async () => {
	let structure: TableStructureResponse;
	try {
		structure = await tables.fetchTableStructure(connectionId.value, tableName.value);
	} catch {
		return;
	}
	const primaryKeys = structure.primaryColumns.map((column) => column.column_name);
	fields.value = structure.structure.map((field) => field.column_name);
	fieldsToExclude.value = fields.value.filter((field) => !primaryKeys.includes(field));
	await getTableSettings();
});

async function getTableSettings() {
	let res: TableSettings | null;
	try {
		res = await tables.fetchTableSettings(connectionId.value, tableName.value);
	} catch {
		return;
	}
	loading.value = false;
	const exists = !!res && Object.keys(res).length !== 0;
	if (res && exists) {
		isSettingsExist.value = true;
		tableSettings.value = res;
		listFieldsOrder.value = [...(res.list_fields ?? [])];
	} else {
		tableSettings.value = { ...TABLE_SETTINGS_INITIAL };
	}
	if (!exists || !res?.list_fields?.length) listFieldsOrder.value = [...fields.value];
	document.title = `${res?.display_name || displayTableName.value} - Table settings | Rocketadmin`;
}

function markDirty() {
	dirty.value = true;
}

function updateIcon(icon: string | null) {
	if (!tableSettings.value) return;
	tableSettings.value.icon = icon ?? '';
	iconChanged.value = true;
}

function onOrderChange() {
	if (!tableSettings.value) return;
	tableSettings.value.list_fields = [...listFieldsOrder.value];
	orderChanged.value = true;
}

function resetColumnsOrder() {
	if (!tableSettings.value) return;
	tableSettings.value.list_fields = [];
	listFieldsOrder.value = [...fields.value];
	orderChanged.value = true;
}

function setList(key: keyof TableSettings, value: string | string[] | null) {
	if (!tableSettings.value) return;
	(tableSettings.value[key] as string[]) = Array.isArray(value) ? value : [];
	markDirty();
}

function setText(key: 'identity_column' | 'ordering_field', value: string | string[] | null) {
	if (!tableSettings.value) return;
	tableSettings.value[key] = typeof value === 'string' ? value : '';
	markDirty();
}

async function updateSettings() {
	const settings = tableSettings.value;
	if (!settings) return;
	submitting.value = true;
	settings.connection_id = connectionId.value;
	settings.table_name = tableName.value;

	// Which settings are set, for analytics.
	const updatedSettings: Record<string, boolean> = {};
	for (const [key, value] of Object.entries(settings)) {
		if (key === 'connection_id' || key === 'table_name' || key === 'ordering') continue;
		if (Array.isArray(value)) {
			updatedSettings[key] = key === 'list_fields' ? orderChanged.value : value.length > 0;
		} else {
			updatedSettings[key] = Boolean(value);
		}
	}

	try {
		await tables.updateTableSettings(isSettingsExist.value, connectionId.value, tableName.value, settings);
		trackTableEvent('Table settings: updated successfully', updatedSettings);
		router.push(`/dashboard/${connectionId.value}/${tableName.value}`);
	} catch {
		// Reported by the store.
	} finally {
		submitting.value = false;
	}
}

async function resetSettings() {
	submitting.value = true;
	try {
		await tables.deleteTableSettings(connectionId.value, tableName.value);
		form.value?.reset();
		dirty.value = false;
		tableSettings.value = { ...TABLE_SETTINGS_INITIAL };
		trackTableEvent('Table settings: reset successfully');
	} catch {
		// Reported by the store.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<div class="table-settings">
		<AppAlert class="table-settings__alert" />
		<PlaceholderTableSettings v-if="loading" />

		<div v-if="tableSettings" class="table-settings__page">
			<AppBreadcrumbs :crumbs="crumbs" />
			<form ref="form" class="table-settings__form" novalidate @submit.prevent="updateSettings" @input="markDirty">
				<div class="table-settings__fields">
					<h2 class="table-settings__heading">General settings</h2>

					<div class="table-settings__display">
						<UiField
							label="Displayed table name"
							hint="Change the name of your table. This will not override your database."
							class="table-settings__display-name"
						>
							<UiInput v-model="tableSettings.display_name" name="display_name" />
						</UiField>
						<AppIconPicker
							:icon="tableSettings.icon"
							:default-icons="defaultIcons"
							reset-button-shown
							tooltip="Choose an icon"
							@change="updateIcon"
						/>
					</div>

					<UiField
						label="Sensitive fields"
						:hint="HINTS.sensitive"
					>
						<UiSelect
							:model-value="tableSettings.sensitive_fields"
							:options="fieldOptions"
							multiple
							name="columns_sensitive"
							@update:model-value="setList('sensitive_fields', $event)"
						/>
					</UiField>

					<UiField label="Identity field" hint="Select a column you want to display as a foreign key field.">
						<UiSelect
							:model-value="tableSettings.identity_column"
							:options="optionalFieldOptions"
							name="identity_column"
							@update:model-value="setText('identity_column', $event)"
						/>
					</UiField>

					<UiSwitch v-model="tableSettings.allow_csv_import" name="allow_import" @update:model-value="markDirty">
						Allow importing rows from CSV
					</UiSwitch>
					<UiSwitch v-model="tableSettings.allow_csv_export" name="allow_export" @update:model-value="markDirty">
						Allow table export to CSV
					</UiSwitch>
					<UiSwitch v-model="tableSettings.can_delete" name="can_delete" @update:model-value="markDirty">
						Allow row deletion
					</UiSwitch>

					<h2 class="table-settings__heading">Table view</h2>
					<UiField
						label="Columns visible by default"
						hint="Choose the columns you want users to see when they first open this table. Changes made to a table's Columns view are saved over the default values."
					>
						<UiSelect
							:model-value="tableSettings.columns_view"
							:options="fieldOptions"
							multiple
							name="columns_view"
							@update:model-value="setList('columns_view', $event)"
						/>
					</UiField>

					<div class="table-settings__order">
						<UiExpansionPanel class="table-settings__order-panel">
							<template #title>
								<span class="table-settings__order-title">
									<span class="table-settings__order-label">Columns order</span>
									<span v-if="tableSettings.list_fields.length === 0">Standard order</span>
									<span v-else>{{ tableSettings.list_fields.join(', ') }}</span>
								</span>
							</template>
							<draggable
								v-model="listFieldsOrder"
								:item-key="(field: string) => field"
								class="table-settings__order-list"
								ghost-class="table-settings__order-item--ghost"
								data-testid="columns-order-list"
								@end="onOrderChange"
							>
								<template #item="{ element }">
									<div class="table-settings__order-item">
										<UiIcon name="drag_indicator" class="table-settings__order-handle" />
										{{ element }}
									</div>
								</template>
							</draggable>
						</UiExpansionPanel>
						<UiIconButton
							icon="restart_alt"
							label="Reset"
							:disabled="tableSettings.list_fields.length === 0"
							data-testid="columns-order-reset-button"
							@click="resetColumnsOrder"
						/>
					</div>

					<UiField label="Searchable columns" hint="Choose the columns Rocketadmin scans when using the Search bar.">
						<UiSelect
							:model-value="tableSettings.search_fields"
							:options="fieldOptions"
							multiple
							name="search_fields"
							@update:model-value="setList('search_fields', $event)"
						/>
					</UiField>

					<div class="table-settings__ordering">
						<UiField label="Order by" class="table-settings__ordering-by">
							<UiSelect
								:model-value="tableSettings.ordering_field"
								:options="optionalFieldOptions"
								name="ordering_field"
								@update:model-value="setText('ordering_field', $event)"
							/>
						</UiField>
						<UiRadioGroup
							v-model="tableSettings.ordering"
							name="ordering"
							aria-label="Order"
							orientation="horizontal"
							class="table-settings__ordering-options"
						>
							<UiRadio :value="TableOrdering.Ascending">Ascending</UiRadio>
							<UiRadio :value="TableOrdering.Descending">Descending</UiRadio>
						</UiRadioGroup>
					</div>

					<UiField
						label="Sortable columns"
						hint="Choose which columns allow you to sort their values by pressing the arrow next to the column's name. Columns which aren't selected will not be sortable."
					>
						<UiSelect
							:model-value="tableSettings.sortable_by"
							:options="fieldOptions"
							multiple
							name="sortable_by"
							@update:model-value="setList('sortable_by', $event)"
						/>
					</UiField>

					<UiField
						label="Columns to hide"
						:hint="HINTS.excluded"
					>
						<UiSelect
							:model-value="tableSettings.excluded_fields"
							:options="excludeOptions"
							multiple
							name="excluded_fields"
							@update:model-value="setList('excluded_fields', $event)"
						/>
					</UiField>

					<div>
						<h2 class="table-settings__heading">"Edit row" behavior</h2>
						<p class="table-settings__subheading">You can edit a row by clicking on the "pencil" icon on the right.</p>
					</div>
					<UiField
						label="Searchable foreign key columns"
						hint="Choose the columns Rocketadmin scans within a related table when selecting a foreign key."
					>
						<UiSelect
							:model-value="tableSettings.autocomplete_columns"
							:options="fieldOptions"
							multiple
							name="autocomplete_columns"
							@update:model-value="setList('autocomplete_columns', $event)"
						/>
					</UiField>

					<UiField
						label="Read-only fields"
						:hint="HINTS.readonly"
					>
						<UiSelect
							:model-value="tableSettings.readonly_fields"
							:options="fieldOptions"
							multiple
							name="readonly_fields"
							@update:model-value="setList('readonly_fields', $event)"
						/>
					</UiField>
				</div>

				<div class="table-settings__actions">
					<UiButton variant="secondary" class="table-settings__back" @click="router.back()">Back</UiButton>
					<UiButton
						variant="danger"
						:disabled="submitting || !isSettingsExist"
						data-testid="table-settings-reset-button"
						@click="resetSettings"
					>
						Reset
					</UiButton>
					<UiButton type="submit" :disabled="saveDisabled" data-testid="table-settings-save-button">Save</UiButton>
				</div>
			</form>
		</div>
	</div>
</template>

<style scoped>
.table-settings {
	padding: 0 var(--space-4);
}

.table-settings__alert {
	margin-top: var(--space-6);
}

.table-settings__page {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-top: var(--space-10);
}

.table-settings__form {
	width: 100%;
}

.table-settings__fields {
	display: flex;
	flex-direction: column;
	gap: var(--space-5);
	max-width: 40.625rem;
	margin: 0 auto;
	padding: var(--space-6) 0 var(--space-10);
}

.table-settings__heading {
	margin: var(--space-5) 0 0;
	font-family: var(--font-display);
	font-size: var(--text-md);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.table-settings__subheading {
	margin: var(--space-1) 0 0;
	color: var(--color-muted);
}

.table-settings__display {
	display: flex;
	align-items: center;
	gap: var(--space-3);
}

.table-settings__display-name {
	flex-grow: 1;
}

.table-settings__order {
	display: flex;
	align-items: flex-start;
	gap: var(--space-3);
}

.table-settings__order-panel {
	flex-grow: 1;
}

.table-settings__order-title {
	display: flex;
	flex-direction: column;
	gap: var(--space-05);
	text-align: start;
}

.table-settings__order-label {
	font-size: var(--text-xs);
	color: var(--color-muted);
}

.table-settings__order-list {
	display: flex;
	flex-direction: column;
}

.table-settings__order-item {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	padding: var(--space-4) var(--space-3);
	background: var(--color-surface);
	cursor: move;
}

.table-settings__order-item:not(:last-child) {
	border-bottom: 1px solid var(--color-line);
}

.table-settings__order-item--ghost {
	opacity: 0.5;
	background: var(--color-paper-2);
}

.table-settings__order-handle {
	color: var(--color-muted);
}

.table-settings__ordering {
	display: flex;
	align-items: flex-end;
	gap: var(--space-3);
}

.table-settings__ordering-by {
	width: 50%;
}

.table-settings__ordering-options {
	flex-shrink: 0;
	padding-bottom: var(--space-2);
}

.table-settings__actions {
	position: sticky;
	bottom: 0;
	z-index: var(--z-sticky);
	display: flex;
	align-items: center;
	gap: var(--space-5);
	padding: var(--space-3) max(calc(50% - 20.3125rem), var(--space-4));
	border-top: 1px solid var(--color-line);
	background: var(--color-paper);
}

.table-settings__back {
	margin-right: auto;
}

@media (width <= 600px) {
	.table-settings__ordering {
		flex-direction: column;
		align-items: flex-start;
	}

	.table-settings__ordering-by {
		width: 100%;
	}
}
</style>
