<script setup lang="ts">
// Port of frontend/src/app/components/users/public-access-panel: which tables of the connection
// anyone can read without signing in, and optionally which of their columns.
//
// A selected table maps to its readable-column whitelist. An empty array means "all columns",
// matching the backend contract where an omitted/empty readableColumns grants every column.
import posthog from 'posthog-js';
import { computed, onMounted, ref, watch } from 'vue';
import AppContentLoader from '@/components/shared/AppContentLoader.vue';
import {
	type SelectOption,
	UiAlert,
	UiButton,
	UiCheckbox,
	UiChip,
	UiExpansionPanel,
	UiField,
	UiIcon,
	UiSelect,
} from '@/components/ui';
import { normalizeTableName } from '@/lib/normalize';
import type { PublicTablePermission } from '@/models/user';
import { useConnectionsStore } from '@/stores/connections';
import { useTablesStore } from '@/stores/tables';
import { useUsersStore } from '@/stores/users';
import type { AvailableTable } from './types';

type TableSelection = Map<string, string[]>;

const users = useUsersStore();
const tablesStore = useTablesStore();
const connections = useConnectionsStore();

const connectionId = connections.connectionID ?? '';

const tables = ref<AvailableTable[]>([]);
const tablesLoading = ref(true);
const submitting = ref(false);

const selection = ref<TableSelection>(new Map());
const columnsByTable = ref<Record<string, string[]>>({});
const loadingColumns = ref<Set<string>>(new Set());

const selectedCount = computed(() => selection.value.size);
const statusLabel = computed(() => {
	const count = selectedCount.value;
	if (count === 0) return 'Disabled';
	return `${count} ${count === 1 ? 'table' : 'tables'}`;
});

// Public access is stored server-side as a derived value: a non-empty table list means enabled.
// `Disable public access` is only meaningful once something is actually stored.
const canDisable = computed(() => users.publicPermissions.enabled);

// Seed the local editing state whenever the server state (re)loads, so an external change is picked
// up. Editing is blocked while a save is in flight, the only window where this re-seed could
// otherwise discard an unsaved edit.
watch(
	() => users.publicPermissions,
	(permissions) => {
		const seeded: TableSelection = new Map();
		for (const table of permissions.tables) seeded.set(table.tableName, table.readableColumns ?? []);
		selection.value = seeded;
		// Every already-public table needs its columns, not just the restricted ones: an unrestricted
		// table still renders the column picker, which would otherwise be empty.
		for (const table of permissions.tables) loadColumns(table.tableName);
	},
	{ immediate: true },
);

onMounted(async () => {
	users.loadPublicPermissions(connectionId);
	try {
		const list = await tablesStore.fetchTables(connectionId);
		tables.value = list.map((table) => ({
			tableName: table.table,
			displayName: table.display_name || normalizeTableName(table.table),
		}));
	} catch {
		// Reported by the store; the panel must not stay on its loader.
	} finally {
		tablesLoading.value = false;
	}
});

function isSelected(tableName: string): boolean {
	return selection.value.has(tableName);
}

function columnOptions(tableName: string): SelectOption<string>[] {
	return (columnsByTable.value[tableName] ?? []).map((column) => ({ value: column, label: column }));
}

function toggleTable(tableName: string, selected: boolean) {
	const next = new Map(selection.value);
	if (selected) next.set(tableName, []);
	else next.delete(tableName);
	selection.value = next;
	if (selected) loadColumns(tableName);
}

function setColumns(tableName: string, columns: string | string[] | null) {
	const next = new Map(selection.value);
	next.set(tableName, Array.isArray(columns) ? columns : []);
	selection.value = next;
}

async function save() {
	posthog.capture('Users access: public access saved');
	submitting.value = true;
	try {
		await users.savePublicPermissions(connectionId, buildPayload());
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}

async function disablePublicAccess() {
	posthog.capture('Users access: public access disabled');
	submitting.value = true;
	try {
		await users.savePublicPermissions(connectionId, []);
		selection.value = new Map();
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}

function buildPayload(): PublicTablePermission[] {
	return [...selection.value.entries()].map(([tableName, columns]) => ({
		tableName,
		readableColumns: columns.length ? columns : undefined,
	}));
}

async function loadColumns(tableName: string) {
	if (columnsByTable.value[tableName] || loadingColumns.value.has(tableName)) return;

	loadingColumns.value = new Set(loadingColumns.value).add(tableName);
	try {
		const res = await tablesStore.fetchTableStructure(connectionId, tableName);
		columnsByTable.value = {
			...columnsByTable.value,
			[tableName]: (res?.structure ?? []).map((field) => field.column_name),
		};
	} catch {
		// Reported by the store.
	} finally {
		const next = new Set(loadingColumns.value);
		next.delete(tableName);
		loadingColumns.value = next;
	}
}
</script>

<template>
	<UiExpansionPanel class="public-access" lazy>
		<template #title>
			<span class="public-access__title">
				<UiIcon name="public" class="public-access__icon" />
				<span>Public access</span>
				<UiChip :tone="selectedCount > 0 ? 'warning' : 'accent'" class="public-access__badge" data-testid="public-access-status">
					{{ statusLabel }}
				</UiChip>
			</span>
		</template>

		<UiAlert tone="warning" :live="false" class="public-access__warning">
			Anyone on the internet can read the tables listed below without signing in. Public access is read-only — rows
			can never be added, edited or deleted.
		</UiAlert>

		<div v-if="tablesLoading || users.publicPermissionsLoading" class="public-access__loader">
			<AppContentLoader />
		</div>
		<p v-else-if="tables.length === 0" class="public-access__empty">No tables in this connection.</p>
		<template v-else>
			<ul class="public-access__tables">
				<li
					v-for="table in tables"
					:key="table.tableName"
					:class="['public-access__table', { 'public-access__table--selected': isSelected(table.tableName) }]"
					data-testid="public-access-table"
				>
					<UiCheckbox
						:model-value="isSelected(table.tableName)"
						:disabled="submitting"
						@update:model-value="toggleTable(table.tableName, $event)"
					>
						{{ table.displayName }}
					</UiCheckbox>

					<template v-if="isSelected(table.tableName)">
						<span v-if="loadingColumns.has(table.tableName)" class="public-access__columns-hint">
							Loading columns…
						</span>
						<UiField
							v-else
							label="Readable columns"
							hint="Leave empty to expose all columns"
							class="public-access__columns"
							data-testid="public-access-columns"
						>
							<UiSelect
								multiple
								size="sm"
								:model-value="selection.get(table.tableName) ?? []"
								:options="columnOptions(table.tableName)"
								:disabled="submitting"
								@update:model-value="setColumns(table.tableName, $event)"
							/>
						</UiField>
					</template>
				</li>
			</ul>

			<div class="public-access__actions">
				<span v-if="canDisable" v-tooltip="'Remove public access to every table'">
					<UiButton variant="ghost" :disabled="submitting" @click="disablePublicAccess">Disable public access</UiButton>
				</span>
				<span class="public-access__spacer" />
				<UiButton :disabled="submitting" @click="save">Save</UiButton>
			</div>
		</template>
	</UiExpansionPanel>
</template>

<style scoped>
.public-access {
	margin-bottom: var(--space-5);
}

.public-access__title {
	display: inline-flex;
	align-items: center;
	gap: var(--space-2);
}

.public-access__icon {
	flex-shrink: 0;
	color: var(--color-muted);
}

.public-access__badge {
	text-transform: uppercase;
	white-space: nowrap;
}

.public-access__warning {
	margin-bottom: var(--space-4);
}

.public-access__loader {
	position: relative;
	min-height: var(--space-16);
}

.public-access__empty {
	margin: 0;
	font-size: var(--text-sm);
}

.public-access__tables {
	margin: 0;
	padding: 0;
	list-style: none;
}

.public-access__table {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--space-3);
	padding: var(--space-1) 0;
}

.public-access__table--selected {
	padding-bottom: var(--space-3);
}

.public-access__columns {
	flex: 1 1 16em;
	min-width: 12em;
}

.public-access__columns-hint {
	font-size: var(--text-xs);
	color: var(--color-muted);
}

.public-access__actions {
	display: flex;
	align-items: center;
	margin-top: var(--space-4);
}

.public-access__spacer {
	flex: 1;
}

@media (width <= 600px) {
	.public-access__table {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-1);
	}

	.public-access__columns {
		width: 100%;
	}
}
</style>
