<script setup lang="ts">
// Port of frontend/src/app/components/connection-settings (/connection-settings/:connectionId):
// the connection's logo, theme colours, hidden tables, default table and audit logging. Creates the
// settings on the first save, updates them afterwards, and "Reset" deletes them.
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { isApiError } from '@/api/client';
import { trackConnectionEvent } from '@/components/connections/analytics';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppBanner from '@/components/shared/AppBanner.vue';
import PlaceholderConnectionSettings from '@/components/skeletons/PlaceholderConnectionSettings.vue';
import { type SelectOption, UiButton, UiField, UiIcon, UiInput, UiSelect, UiSwitch } from '@/components/ui';
import { environment } from '@/environment';
import { normalizeTableName } from '@/lib/normalize';
import { AlertType } from '@/models/alert';
import type { ConnectionSettings } from '@/models/connection';
import type { TableProperties } from '@/models/table';
import { useConnectionsStore } from '@/stores/connections';
import { useTablesStore } from '@/stores/tables';

const INITIAL_SETTINGS: Readonly<ConnectionSettings> = Object.freeze({
	hidden_tables: [],
	default_showing_table: null as unknown as string,
	primary_color: '',
	secondary_color: '',
	logo_url: '',
	company_name: '',
	tables_audit: true,
});

/** The failed tables request, as the error banner shows it. */
interface PageError {
	abstract: string;
	details?: string;
}

const route = useRoute();
const connections = useConnectionsStore();
const tables = useTablesStore();

const isSaas = environment.saas;
const connectionID = computed(() => {
	const value = route.params.connectionId;
	return (Array.isArray(value) ? value[0] : value) || '';
});

const tablesList = ref<TableProperties[] | null>(null);
const connectionSettings = ref<ConnectionSettings>(freshSettings());
const loading = ref(false);
const submitting = ref(false);
const isSettingsExist = ref(false);
const noTablesError = ref(false);
const serverError = ref<PageError | null>(null);
/** No field was edited yet (NgForm's `pristine`): Save stays disabled. */
const pristine = ref(true);

const connectionName = computed(() => connections.connection.title || connections.connection.database);

const tableOptions = computed<SelectOption<string>[]>(() =>
	(tablesList.value ?? []).map((table) => ({
		value: table.table,
		label: `${table.display_name || table.normalizedTableName} (${table.table})`,
	})),
);

watch(
	() => connections.connectionTitle,
	(connectionTitle) => {
		document.title = `Settings - ${connectionTitle} | Rocketadmin`;
	},
	{ immediate: true },
);

onMounted(async () => {
	loading.value = true;
	try {
		const res = await tables.fetchTables(connectionID.value, true);
		if (res.length) {
			tablesList.value = res.map((table) =>
				table.display_name ? { ...table } : { ...table, normalizedTableName: normalizeTableName(table.table) },
			);
		} else {
			noTablesError.value = true;
		}
		await getSettings();
	} catch (error) {
		loading.value = false;
		serverError.value = toServerError(error);
	}
});

async function getSettings() {
	try {
		const res = await connections.getConnectionSettings(connectionID.value);
		if (res) {
			connectionSettings.value = { ...res };
			isSettingsExist.value = true;
		} else {
			connectionSettings.value = freshSettings();
			isSettingsExist.value = false;
		}
	} catch {
		// The store has shown the error.
	} finally {
		loading.value = false;
	}
}

function handleSettingsSubmitting() {
	if (isSettingsExist.value) updateSettings();
	else createSettings();
}

async function createSettings() {
	submitting.value = true;
	const changed = summarize(connectionSettings.value);
	try {
		await connections.createConnectionSettings(connectionID.value, connectionSettings.value);
		getSettings();
		trackConnectionEvent('Connection settings: settings is created successfully', changed, undefined);
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}

async function updateSettings() {
	submitting.value = true;
	const changed = summarize(connectionSettings.value);
	try {
		await connections.updateConnectionSettings(connectionID.value, connectionSettings.value);
		getSettings();
		trackConnectionEvent('Connection settings: settings is updated successfully', changed, undefined);
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}

async function resetSettings() {
	submitting.value = true;
	try {
		await connections.deleteConnectionSettings(connectionID.value);
		getSettings();
		trackConnectionEvent('Connection settings: settings is reset successfully');
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}

function edited<K extends keyof ConnectionSettings>(key: K, value: ConnectionSettings[K]) {
	connectionSettings.value[key] = value;
	pristine.value = false;
}

function onHiddenTables(value: string | string[] | null) {
	edited('hidden_tables', Array.isArray(value) ? value : []);
}

function onDefaultTable(value: string | string[] | null) {
	edited('default_showing_table', (typeof value === 'string' ? value : null) as unknown as string);
}

function onAudit(value: boolean) {
	edited('tables_audit', value);
	trackConnectionEvent('Connection settings: log recording is toggled', { enable: value }, undefined);
}

function toServerError(error: unknown): PageError {
	if (!isApiError(error)) return { abstract: error instanceof Error ? error.message : String(error) };
	const abstract = error.body.message || error.message;
	return error.details ? { abstract, details: error.details } : { abstract };
}

function openIntercom() {
	window.Intercom?.('show');
}

function freshSettings(): ConnectionSettings {
	return { ...INITIAL_SETTINGS, hidden_tables: [] };
}

/** What the analytics event reports: which settings are set, not their values. */
function summarize(settings: ConnectionSettings): Record<string, boolean> {
	return Object.fromEntries(
		Object.entries(settings).map(([key, value]) => [
			key,
			key === 'hidden_tables' ? Array.isArray(value) && value.length > 0 : Boolean(value),
		]),
	);
}
</script>

<template>
	<div class="connection-settings">
		<AppAlert class="connection-settings__alert" />

		<h1 class="connection-settings__title">
			Settings for <strong>{{ connectionName }}</strong> connection
		</h1>

		<PlaceholderConnectionSettings v-if="loading" />

		<AppBanner v-if="noTablesError" :type="AlertType.Info" class="connection-settings__banner">
			<h3 class="connection-settings__banner-title">Rocketadmin can not find any tables</h3>
			<p>
				There are no tables to apply settings. Please grant Rocketadmin access to required tables or create new
				table. You can create a table with SQL editor
			</p>
		</AppBanner>

		<AppBanner
			v-if="serverError"
			:type="AlertType.Error"
			class="connection-settings__banner"
			data-testid="connection-settings-server-error"
		>
			<div v-if="serverError.details">
				<strong>{{ serverError.abstract }}</strong>
				<p class="connection-settings__error-details">{{ serverError.details }}</p>
			</div>
			<p v-else>{{ serverError.abstract }}</p>
			<template #actions>
				<UiButton v-if="connections.canEditConnection" variant="secondary" :to="`/edit-db/${connectionID}`">
					Check database credentials
				</UiButton>
				<UiButton v-if="isSaas" variant="danger" @click="openIntercom">Chat with support</UiButton>
				<UiButton
					v-else
					variant="danger"
					href="https://github.com/rocket-admin/rocketadmin/issues"
					target="_blank"
					rel="noopener noreferrer"
				>
					Report a bug
				</UiButton>
			</template>
		</AppBanner>

		<form
			v-if="!serverError && !noTablesError && !loading"
			class="connection-settings__form"
			novalidate
			@submit.prevent="handleSettingsSubmitting"
		>
			<div class="connection-settings__fields">
				<div class="connection-settings__logo">
					<div v-if="connectionSettings.logo_url" class="connection-settings__logo-box">
						<img :src="connectionSettings.logo_url" class="connection-settings__logo-img" alt="project-logo">
					</div>
					<UiIcon v-else name="image" class="connection-settings__logo-stub" />
					<UiField label="Logo URL" class="connection-settings__logo-input">
						<UiInput
							:model-value="connectionSettings.logo_url"
							name="logo-url"
							:disabled="submitting"
							@update:model-value="edited('logo_url', $event)"
							@change="trackConnectionEvent('Connection settings: logo URL is edited')"
						/>
					</UiField>
				</div>

				<div class="connection-settings__colors">
					<div class="connection-settings__color">
						<span
							class="connection-settings__color-sample"
							:style="{ '--sample-color': connectionSettings.primary_color }"
							aria-hidden="true"
						/>
						<UiField label="Primary color (HEX)">
							<UiInput
								:model-value="connectionSettings.primary_color"
								name="primary-color"
								class="connection-settings__color-input"
								:disabled="submitting"
								@update:model-value="edited('primary_color', $event)"
								@change="trackConnectionEvent('Connection settings: primary color is edited')"
							/>
						</UiField>
					</div>

					<div class="connection-settings__color">
						<span
							class="connection-settings__color-sample"
							:style="{ '--sample-color': connectionSettings.secondary_color }"
							aria-hidden="true"
						/>
						<UiField label="Accented color (HEX)">
							<UiInput
								:model-value="connectionSettings.secondary_color"
								name="accented-color"
								class="connection-settings__color-input"
								:disabled="submitting"
								@update:model-value="edited('secondary_color', $event)"
								@change="trackConnectionEvent('Connection settings: accented color is edited')"
							/>
						</UiField>
					</div>
				</div>

				<UiField label="Hidden tables">
					<UiSelect
						:model-value="connectionSettings.hidden_tables ?? []"
						name="hidden_tables"
						multiple
						:options="tableOptions"
						:disabled="submitting"
						@update:model-value="onHiddenTables"
						@click="trackConnectionEvent('Connection settings: hidden tables is selected')"
					/>
				</UiField>

				<UiField label="Table displayed by default">
					<UiSelect
						:model-value="connectionSettings.default_showing_table ?? null"
						name="default_showing_table"
						placeholder=" "
						:options="tableOptions"
						:disabled="submitting"
						@update:model-value="onDefaultTable"
						@click="trackConnectionEvent('Connection settings: default display table is selected')"
					/>
				</UiField>

				<UiSwitch
					name="audit"
					class="connection-settings__audit"
					:model-value="Boolean(connectionSettings.tables_audit)"
					:disabled="submitting"
					@update:model-value="onAudit"
				>
					Log changes in tables
				</UiSwitch>
			</div>

			<div v-if="connections.canEditConnection" class="connection-settings__actions">
				<UiButton variant="danger" :disabled="!isSettingsExist || submitting" @click="resetSettings">Reset</UiButton>
				<UiButton type="submit" data-testid="connection-settings-save-button" :disabled="submitting || pristine">
					Save
				</UiButton>
			</div>
		</form>
	</div>
</template>

<style scoped>
.connection-settings {
	/* The Angular page's centred 650px column. */
	--settings-gutter: max(calc(50vw - 325px), 10%);

	min-height: 100%;
	padding: var(--space-8) var(--settings-gutter);
}

.connection-settings__alert {
	margin-bottom: var(--space-6);
}

.connection-settings__title {
	margin: 0 0 var(--space-8);
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-regular);
	color: var(--color-ink);
}

.connection-settings__banner-title {
	margin: 0 0 var(--space-2);
	font-size: var(--text-md);
}

.connection-settings__error-details {
	margin-top: var(--space-2);
}

.connection-settings__fields {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: var(--space-4);
	padding-bottom: var(--space-16);
}

.connection-settings__logo {
	display: flex;
	align-items: flex-end;
	gap: var(--space-4);
	width: 100%;
}

.connection-settings__logo-box {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 2.75rem;
	max-width: 10rem;
	padding: var(--space-1) var(--space-2);
	border-radius: var(--radius-control);
	background: var(--color-ink);
}

.connection-settings__logo-img {
	height: 2.5rem;
	max-width: 8.5rem;
	object-fit: contain;
}

.connection-settings__logo-stub {
	margin-bottom: var(--space-2);
	color: var(--color-muted);
}

.connection-settings__logo-input {
	flex-grow: 1;
}

.connection-settings__colors {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--space-6);
}

.connection-settings__color {
	position: relative;
}

.connection-settings__color-sample {
	position: absolute;
	bottom: var(--space-2);
	left: var(--space-2);
	height: 1.5rem;
	width: 1.5rem;
	border-radius: var(--radius-control);
	background-color: var(--sample-color);
	pointer-events: none;
}

.connection-settings__color :deep(.connection-settings__color-input) {
	padding-left: var(--space-10);
}

.connection-settings__audit {
	margin-top: var(--space-1);
}

.connection-settings__actions {
	position: fixed;
	bottom: 0;
	left: 0;
	z-index: var(--z-sticky);
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 4rem;
	width: 100vw;
	padding: 0 var(--settings-gutter);
	background-color: var(--color-surface);
	box-shadow: var(--shadow-card);
}

@media (width <= 600px) {
	.connection-settings__colors {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
}
</style>
