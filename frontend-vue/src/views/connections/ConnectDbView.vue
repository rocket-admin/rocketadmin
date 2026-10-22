<script setup lang="ts">
// Port of frontend/src/app/components/connect-db: adds a connection (/connect-db, optionally
// `?type=<db>`) or edits the credentials of one (/edit-db/:connectionId).
//
// A direct connection is tested before it is saved: a failed test opens the connection-error
// dialog (save anyway / keep editing). A new direct connection first shows the IP-access dialog
// (not for DynamoDB) and then goes on to /auto-configure; an agent connection shows its token
// instead. The credentials fields come from the form of the chosen database type.
//
// Angular edited the connections service's `currentConnection` in place; here the page edits a
// reactive draft copied from the store (and re-copied when the store loads the connection).
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { trackConnectionEvent } from '@/components/connections/analytics';
import { CREDENTIALS_FORMS } from '@/components/connections/credentials';
import DbConnectionConfirmDialog from '@/components/connections/DbConnectionConfirmDialog.vue';
import DbConnectionDeleteDialog from '@/components/connections/DbConnectionDeleteDialog.vue';
import DbConnectionIpAccessDialog from '@/components/connections/DbConnectionIpAccessDialog.vue';
import {
	type DbConnectionConfirmDialogData,
	type DbConnectionDeleteDialogData,
	type DbConnectionIpAccessDialogData,
	IP_ACCESS_CONFIRMED,
} from '@/components/connections/dialogs';
import { DEFAULT_PORTS, getProvider, ROCKETADMIN_IP } from '@/components/connections/provider';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppIpAddressButton from '@/components/shared/AppIpAddressButton.vue';
import {
	type SelectOption,
	UiButton,
	UiField,
	UiIcon,
	UiIconButton,
	UiInput,
	UiSegmented,
	UiSelect,
} from '@/components/ui';
import { useDialog } from '@/composables/useDialog';
import { supportedDatabasesTitles, supportedOrderedDatabases } from '@/consts/databases';
import { environment } from '@/environment';
import { copyToClipboard } from '@/lib/clipboard';
import { type Alert, AlertActionType, AlertType } from '@/models/alert';
import { type Connection, ConnectionType, DBtype, type TestConnection } from '@/models/connection';
import { CONNECTION_INITIAL_STATE, useConnectionsStore } from '@/stores/connections';
import { useNotificationsStore } from '@/stores/notifications';
import { useUserStore } from '@/stores/user';
import {
	connectionStringErrorMessage,
	connectionStringErrors,
	parseConnectionString,
} from '@/validators/connection-string.validator';

const route = useRoute();
const router = useRouter();
const connections = useConnectionsStore();
const notifications = useNotificationsStore();
const user = useUserStore();
const dialog = useDialog();

const isSaas = environment.saas;

const DB_TYPE_OPTIONS: SelectOption<DBtype>[] = supportedOrderedDatabases.map((type) => ({
	value: type as DBtype,
	label: supportedDatabasesTitles[type as keyof typeof supportedDatabasesTitles],
}));

const CONNECTION_TYPE_OPTIONS: SelectOption<ConnectionType>[] = [
	{ value: ConnectionType.Direct, label: 'Direct connection' },
	{ value: ConnectionType.Agent, label: 'Agent connection' },
];

/** The IP hint for a new direct connection is a warning alert whose body is the slot. */
const warning = { id: 10000000, type: AlertType.Warning, message: null } as unknown as Alert;

const connectionID = ref<string | null>(routeParam('connectionId'));
const db = reactive<Connection>(connectionID.value ? { ...connections.connection } : { ...CONNECTION_INITIAL_STATE });
const masterKey = ref<string | null>(null);
const connectionToken = ref<string | null>(null);
const submitting = ref(false);
const submitted = ref(false);

const connectionString = ref('');
const connectionStringTouched = ref(false);
const parsedConnectionString = ref('');
const autoFilledFields = ref(new Set<string>());
const fieldsOverridden = ref(false);

const databaseType = route.query.type;
if (typeof databaseType === 'string' && databaseType) {
	db.type = databaseType as DBtype;
	db.port = DEFAULT_PORTS[databaseType as DBtype];
}

// Edit mode: the store loads the route's connection after navigation; take it over once it arrives.
watch(
	() => connections.connection,
	(loaded) => {
		if (connectionID.value && loaded.id === routeParam('connectionId')) Object.assign(db, { ...loaded });
	},
);

const accessLevel = computed(() => connections.connectionAccessLevel);
const mode = computed(() => (db.id ? 'edit' : 'add'));
const credentialsForm = computed(() => CREDENTIALS_FORMS[db.type] ?? null);
const readonly = computed(() => Boolean((accessLevel.value === 'readonly' || db.isTestConnection) && db.id));
const showIpWarning = computed(
	() => db.connectionType === ConnectionType.Direct && !db.isTestConnection && isSaas && db.type !== DBtype.Dynamo,
);
const connectionStringError = computed(() => {
	if (!connectionStringTouched.value && !submitted.value) return undefined;
	const errors = connectionStringErrors(connectionString.value);
	return errors ? connectionStringErrorMessage(errors) : undefined;
});

watch(
	() => connections.connectionTitle,
	(connectionTitle) => {
		document.title = connectionID.value
			? `Credentials — ${connectionTitle} | Rocketadmin`
			: 'Add new database | Rocketadmin';
	},
	{ immediate: true },
);

onMounted(() => {
	if (!connectionID.value) {
		user.sendUserAction('CONNECTION_CREATION_NOT_FINISHED');
		if (isSaas) (window as Window & { fbq?: (...args: unknown[]) => void }).fbq?.('trackCustom', 'Add_connection');
	}
});

function track(what: string, properties?: Record<string, unknown>) {
	trackConnectionEvent(`Connection creds ${mode.value}: ${what}`, properties);
}

function dbTypeChange(type: DBtype | DBtype[] | null) {
	if (!type || Array.isArray(type)) return;
	db.type = type;
	db.port = DEFAULT_PORTS[type];
	track('db type is selected', { dbType: type });
}

async function testConnection() {
	submitting.value = true;
	try {
		const credsCorrect = await connections.testConnection(connectionID.value, db);
		const action = `Connect DB: manual test connection before ${db.id ? 'edit' : 'add'} is ${credsCorrect.result ? 'passed' : 'failed'}`;
		trackConnectionEvent(action, { errorMessage: credsCorrect.message });
		if (credsCorrect.result) {
			notifications.dismissAlert();
			notifications.showSuccessSnackbar('Connection is live');
		} else {
			notifications.showAlert(AlertType.Error, credsCorrect.message, [
				{ type: AlertActionType.Button, caption: 'Dismiss', action: () => notifications.dismissAlert() },
			]);
		}
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}

async function createConnectionRequest() {
	try {
		const res = await connections.createConnection(db, masterKey.value ?? '');
		if (db.connectionType === ConnectionType.Agent) {
			connectionToken.value = res.token ?? null;
			connectionID.value = res.id;
		} else {
			router.push(`/auto-configure/${res.id}`);
		}
		trackConnectionEvent('Connect DB: connection is added successfully', {
			connectionType: db.connectionType,
			dbType: db.type,
		});
	} catch (error) {
		trackConnectionEvent('Connect DB: connection is added unsuccessfully', {
			connectionType: db.connectionType,
			dbType: db.type,
			errorMessage: errorMessageOf(error),
		});
	} finally {
		submitting.value = false;
	}
}

async function updateConnectionRequest() {
	try {
		const res = await connections.updateConnection(db, masterKey.value ?? '');
		if (db.connectionType === ConnectionType.Agent) {
			connectionToken.value = res.connection.token ?? null;
			trackConnectionEvent('Connect DB: connection is edited successfully', { connectionType: 'agent' });
		} else {
			trackConnectionEvent('Connect DB: connection is edited successfully', { connectionType: 'direct' });
			router.push(`/dashboard/${res.connection.id}`);
		}
	} catch (error) {
		trackConnectionEvent('Connect DB: connection is edited unsuccessfully', { errorMessage: errorMessageOf(error) });
	} finally {
		submitting.value = false;
	}
}

function handleConnectionError(errorMessage: string) {
	dialog.open<string, DbConnectionConfirmDialogData>(DbConnectionConfirmDialog, {
		data: { dbCreds: db, provider: getProvider(db), masterKey: masterKey.value, errorMessage },
	});
	submitting.value = false;
}

function handleCredentialsSubmitting() {
	submitted.value = true;
	db.masterEncryption = Boolean(masterKey.value);
	if (db.id) editConnection();
	else createConnection();
}

async function editConnection() {
	submitting.value = true;
	let credsCorrect: TestConnection;
	try {
		credsCorrect = await connections.testConnection(connectionID.value, db);
	} catch {
		submitting.value = false;
		return;
	}
	trackConnectionEvent(
		`Connect DB: automatic test connection on edit is ${credsCorrect.result ? 'passed' : 'failed'}`,
		{
			errorMessage: credsCorrect.message,
		},
	);
	if (db.connectionType === ConnectionType.Agent || credsCorrect.result) updateConnectionRequest();
	else handleConnectionError(credsCorrect.message);
}

async function createConnection() {
	if (db.connectionType !== ConnectionType.Direct) {
		createConnectionRequest();
		return;
	}
	if (db.type !== DBtype.Dynamo) {
		const action = await dialog
			.open<string, DbConnectionIpAccessDialogData>(DbConnectionIpAccessDialog, {
				data: { db, provider: getProvider(db) },
			})
			.afterClosed();
		if (action !== IP_ACCESS_CONFIRMED) return;
	}
	await testBeforeCreate();
}

async function testBeforeCreate() {
	submitting.value = true;
	let credsCorrect: TestConnection;
	try {
		credsCorrect = await connections.testConnection(connectionID.value, db);
	} catch {
		submitting.value = false;
		return;
	}
	trackConnectionEvent(`Connect DB: automatic test connection on add is ${credsCorrect.result ? 'passed' : 'failed'}`, {
		connectionType: db.connectionType,
		dbType: db.type,
		errorMessage: credsCorrect.message,
	});
	if (credsCorrect.result) createConnectionRequest();
	else handleConnectionError(credsCorrect.message);
}

function confirmDeleteConnection(event: Event) {
	event.preventDefault();
	event.stopImmediatePropagation();
	dialog.open<void, DbConnectionDeleteDialogData>(DbConnectionDeleteDialog, { data: db });
}

async function copyToken() {
	if (connectionToken.value && (await copyToClipboard(connectionToken.value))) {
		notifications.showSuccessSnackbar('Connection token was copied to clipboard.');
	}
}

function switchToAgent() {
	db.connectionType = ConnectionType.Agent;
}

function handleMasterKeyChange(newMasterKey: string) {
	masterKey.value = newMasterKey;
}

function onConnectionStringChange(value: string) {
	connectionString.value = value;
	if (!value.trim()) return;
	try {
		const parsed = parseConnectionString(value);
		parsedConnectionString.value = value;
		const filled = new Set(['host', 'port', 'username', 'password', 'database']);
		fieldsOverridden.value = false;
		db.type = parsed.dbType;
		db.host = parsed.host;
		db.port = parsed.port;
		db.username = parsed.username;
		db.password = parsed.password;
		db.database = parsed.database;
		if (parsed.authSource) {
			db.authSource = parsed.authSource;
			filled.add('authSource');
		}
		if (parsed.schema) {
			db.schema = parsed.schema;
			filled.add('schema');
		}
		if (parsed.ssl) db.ssl = true;
		autoFilledFields.value = filled;
		setTimeout(() => {
			connectionString.value = '';
		}, 300);
	} catch {
		// The field shows the validation error.
	}
}

function clearAutoFilledField(field: string) {
	const next = new Set(autoFilledFields.value);
	next.delete(field);
	autoFilledFields.value = next;
	fieldsOverridden.value = true;
}

function routeParam(name: string): string | null {
	const value = route.params[name];
	return (Array.isArray(value) ? value[0] : value) || null;
}

function errorMessageOf(error: unknown): string | undefined {
	return error instanceof Error ? error.message : undefined;
}
</script>

<template>
	<div class="connect-db">
		<AppAlert class="connect-db__alert" />

		<form class="connect-db__form" novalidate @submit.prevent="handleCredentialsSubmitting">
			<h1 class="connect-db__title connect-db__full">
				{{ connectionID ? 'Edit credentials' : 'Connect database' }}
			</h1>

			<UiField
				label="Connection title"
				class="connect-db__connection-title"
				:required="db.connectionType === ConnectionType.Agent"
			>
				<UiInput
					v-model="db.title"
					name="title"
					data-testid="connection-title-input"
					:readonly="readonly"
					:disabled="submitting"
					@change="track('title is edited')"
				/>
			</UiField>

			<UiField label="Database type">
				<UiSelect
					:model-value="db.type"
					name="dbtype"
					data-testid="connection-dbtype-select"
					:options="DB_TYPE_OPTIONS"
					:disabled="submitting"
					@update:model-value="dbTypeChange"
				/>
			</UiField>

			<div class="connect-db__full connect-db__type-switch">
				<UiSegmented
					v-model="db.connectionType"
					label="Connection type"
					data-testid="connection-type-toggle"
					:options="CONNECTION_TYPE_OPTIONS"
					:disabled="submitting || Boolean(db.isTestConnection) || db.type === DBtype.Dynamo"
				/>
			</div>

			<div v-if="showIpWarning" data-testid="direct-connection-warning" class="connect-db__full">
				<div v-if="connectionID" class="connect-db__warning">
					<UiIcon name="warning" class="connect-db__warning-icon" />
					<p class="connect-db__warning-text">
						Please make sure our servers are able to access your database. <br>
						Rocketadmin uses the IP address <AppIpAddressButton :ip="ROCKETADMIN_IP" /> for all outbound requests.
					</p>
				</div>
				<AppAlert v-else :alert="warning" class="connect-db__ip-alert">
					<p class="connect-db__warning-text">
						Please make sure our servers are able to access your database. <br>
						Rocketadmin uses the IP address <AppIpAddressButton :ip="ROCKETADMIN_IP" /> for all outbound requests.
					</p>
				</AppAlert>
			</div>

			<div
				v-if="db.connectionType === ConnectionType.Direct && !db.id"
				class="connect-db__full connect-db__connection-string"
			>
				<div class="connect-db__connection-string-header">
					<UiIcon name="link" size="sm" />
					<span>Quick connect with a connection string</span>
				</div>
				<p class="connect-db__connection-string-description">
					Paste your database connection URI below to automatically fill in all the credentials fields. The string is
					not stored — only the parsed values are used.
				</p>
				<UiField label="Connection string" :error="connectionStringError">
					<UiInput
						:model-value="connectionString"
						name="connectionString"
						data-testid="connection-string-input"
						placeholder="e.g. postgresql://user:password@host:5432/dbname"
						:disabled="submitting"
						@update:model-value="onConnectionStringChange"
						@blur="connectionStringTouched = true"
					/>
				</UiField>
				<p v-if="parsedConnectionString" class="connect-db__connection-string-parsed">
					<UiIcon name="check_circle" size="sm" />
					<span>
						<span class="connect-db__connection-string-parsed-label">Parsed:</span>
						<code class="connect-db__connection-string-parsed-value">{{ parsedConnectionString }}</code>
					</span>
				</p>
				<p v-if="fieldsOverridden" class="connect-db__connection-string-note">
					<UiIcon name="info" size="sm" />
					Fields are now the source of truth — paste a new connection string to override them
				</p>
			</div>

			<div v-if="db.connectionType === ConnectionType.Direct && credentialsForm" class="connect-db__credentials">
				<component
					:is="credentialsForm"
					:connection="db"
					:submitting="submitting"
					:access-level="accessLevel"
					:master-key="masterKey"
					:readonly="readonly"
					:auto-filled-fields="autoFilledFields"
					:submitted="submitted"
					@switch-to-agent="switchToAgent"
					@master-key-change="handleMasterKeyChange"
					@field-change="clearAutoFilledField"
				/>
			</div>

			<div v-if="db.connectionType === ConnectionType.Agent" class="connect-db__full connect-db__agent">
				<div class="connect-db__agent-docker">
					<p>Visit our DockerHub page to install the Rocketadmin agent.</p>

					<UiButton
						href="https://hub.docker.com/r/rocketadmin/rocketadmin-agent"
						target="_blank"
						rel="noopener"
						data-testid="connection-agent-dockerhub-link"
						@click="track('open github agent page')"
					>
						<template #leading>
							<svg
								class="connect-db__docker-icon"
								xmlns="http://www.w3.org/2000/svg"
								aria-hidden="true"
								viewBox="0 0 512 512"
							>
								<path
									stroke="currentColor"
									stroke-width="38"
									fill="none"
									d="M296 226h42m-92 0h42m-91 0h42m-91 0h41m-91 0h42m8-46h41m8 0h42m7 0h42m-42-46h42"
								/>
								<path
									fill="currentColor"
									d="m472 228s-18-17-55-11c-4-29-35-46-35-46s-29 35-8 74c-6 3-16 7-31 7H68c-5 19-5 145 133 145 99 0 173-46 208-130 52 4 63-39 63-39"
								/>
							</svg>
						</template>
						Install Rocketadmin agent
					</UiButton>

					<p>
						Once the installation is successfully completed, the new connection will appear in the list of your admin
						panels.
					</p>

					<UiButton
						variant="secondary"
						href="https://docs.rocketadmin.com/Create%20connections/Agent%20connection/agent_connection"
						target="_blank"
						rel="noopener"
						data-testid="connection-agent-instruction-link"
						@click="track('open agent connection instruction')"
					>
						Check out the complete guide
					</UiButton>
				</div>

				<div v-if="connectionToken" class="connect-db__agent-token">
					<UiField
						label="Token"
						hint="Please save this token and use it to configure your agent connection in .config.env file."
						class="connect-db__agent-token-field"
					>
						<UiInput :model-value="connectionToken" name="token" data-testid="connection-agent-token-input" readonly />
					</UiField>
					<UiIconButton
						icon="content_copy"
						label="Copy mater password"
						data-testid="connection-agent-token-copy-button"
						class="connect-db__agent-token-copy"
						@click="copyToken"
					/>
				</div>
			</div>

			<div v-if="db.isTestConnection" class="connect-db__test-actions">
				<p class="connect-db__test-message">You cannot edit test connection.</p>
				<UiButton to="/connect-db" data-testid="test-connection-actions-create-own-link">Create your own</UiButton>
				<UiButton
					variant="ghost"
					data-testid="test-connection-actions-delete-button"
					:disabled="submitting"
					@click="confirmDeleteConnection($event); trackConnectionEvent('Connection creds test: delete db is clicked')"
				>
					Delete
				</UiButton>
			</div>

			<div v-if="!db.id && !db.isTestConnection" class="connect-db__actions">
				<UiButton
					variant="secondary"
					to="/connections-list"
					class="connect-db__actions-start"
					data-testid="add-connection-actions-back-link"
				>
					Back
				</UiButton>
				<UiButton
					v-if="db.connectionType === ConnectionType.Direct"
					variant="ghost"
					data-testid="add-connection-actions-test-button"
					:disabled="submitting"
					@click="testConnection(); track('test db creds is clicked')"
				>
					Test connection
				</UiButton>
				<UiButton
					v-if="!connectionToken && !connectionID"
					type="submit"
					data-testid="add-connection-actions-add-button"
					:disabled="submitting"
					@click="trackConnectionEvent('Connection creds add: db add clicked')"
				>
					{{ submitting ? 'Checking' : 'Add' }}
				</UiButton>
				<UiButton
					v-if="connectionToken && connectionID"
					:to="`/dashboard/${connectionID}`"
					data-testid="add-connection-actions-open-dashboard-link"
				>
					Open dashboard
				</UiButton>
			</div>

			<div v-if="connections.canEditConnection && db.id && !db.isTestConnection" class="connect-db__actions">
				<UiButton
					variant="danger"
					class="connect-db__actions-start"
					data-testid="edit-connection-actions-delete-button"
					:disabled="submitting"
					@click="confirmDeleteConnection($event); trackConnectionEvent('Connection creds edit: delete db is clicked')"
				>
					Delete
				</UiButton>
				<UiButton
					variant="ghost"
					data-testid="edit-connection-actions-test-button"
					:disabled="submitting"
					@click="testConnection(); track('test db creads is clicked')"
				>
					Test connection
				</UiButton>
				<UiButton
					v-if="db.connectionType === ConnectionType.Direct || !connectionToken"
					type="submit"
					data-testid="edit-connection-actions-edit-button"
					:disabled="submitting || Boolean(db.isTestConnection)"
					@click="trackConnectionEvent('Connection creds edit: db edit is clicked')"
				>
					{{ submitting ? 'Checking' : 'Edit' }}
				</UiButton>
				<UiButton
					v-if="connectionToken && connectionID && db.connectionType === ConnectionType.Agent"
					:to="`/dashboard/${connectionID}`"
					data-testid="edit-connection-actions-open-dashboard-link"
				>
					Open dashboard
				</UiButton>
			</div>
		</form>
	</div>
</template>

<style scoped>
.connect-db {
	padding: var(--space-8) var(--space-4) var(--space-16);
}

.connect-db__alert,
.connect-db__ip-alert {
	margin-bottom: var(--space-6);
}

.connect-db__form {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: var(--space-2) var(--space-6);
	margin: 0 auto var(--space-10);
	width: clamp(18.75em, 96%, 50em);
}

.connect-db__full,
.connect-db__credentials {
	grid-column: 1 / -1;
}

.connect-db__credentials {
	display: grid;
	grid-template-columns: subgrid;
	row-gap: var(--space-4);
}

.connect-db__title {
	margin: var(--space-6) 0 var(--space-4);
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.connect-db__connection-title {
	grid-column: 1 / span 3;
}

.connect-db__type-switch {
	margin: var(--space-2) 0 var(--space-3);
}

.connect-db__warning {
	display: flex;
	align-items: center;
	gap: var(--space-3);
	margin-bottom: var(--space-2);
	padding: var(--space-4) var(--space-3);
	border-radius: var(--radius-control);
	background: var(--color-paper-2);
}

.connect-db__warning-icon {
	flex-shrink: 0;
	color: var(--color-warning);
}

.connect-db__warning-text {
	margin: 0;
	line-height: var(--leading-relaxed);
}

.connect-db__connection-string {
	margin-bottom: var(--space-4);
	padding: var(--space-4);
	border: 1px solid var(--color-line-strong);
	border-radius: var(--radius-panel);
	background-color: var(--color-surface);
}

.connect-db__connection-string-header {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	margin-bottom: var(--space-1);
	color: var(--color-accent);
	font-weight: var(--weight-medium);
}

.connect-db__connection-string-description {
	margin: 0 0 var(--space-3);
	font-size: var(--text-xs);
	color: var(--color-muted);
}

.connect-db__connection-string-parsed {
	display: flex;
	align-items: flex-start;
	gap: var(--space-2);
	margin: var(--space-2) 0 0;
	color: var(--color-success);
	font-size: var(--text-xs);
}

.connect-db__connection-string-parsed-label {
	margin-right: var(--space-1);
	font-weight: var(--weight-medium);
}

.connect-db__connection-string-parsed-value {
	font-family: var(--font-mono);
	word-break: break-all;
}

.connect-db__connection-string-note {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	margin: var(--space-2) 0 0;
	color: var(--color-accent);
	font-size: var(--text-sm);
	font-weight: var(--weight-medium);
}

.connect-db__agent-docker {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--space-4);
	margin-top: var(--space-6);
}

.connect-db__agent-docker p {
	margin: 0;
}

.connect-db__docker-icon {
	height: 1.375rem;
	width: 1.375rem;
}

.connect-db__agent-token {
	display: flex;
	align-items: flex-start;
	gap: var(--space-3);
	margin: var(--space-8) 0 var(--space-5);
	width: 100%;
}

.connect-db__agent-token-field {
	flex-grow: 1;
}

.connect-db__agent-token-copy {
	margin-top: var(--space-6);
}

.connect-db__test-actions {
	grid-column: 1 / -1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--space-3);
	margin-top: var(--space-4);
}

.connect-db__test-message {
	margin: 0 0 var(--space-1);
	color: var(--color-muted);
}

.connect-db__actions {
	grid-column: 1 / -1;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--space-5);
	margin-top: var(--space-3);
}

.connect-db__actions-start {
	margin-right: auto;
}

@media (width <= 600px) {
	.connect-db__form {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.connect-db__credentials {
		display: flex;
		flex-direction: column;
	}
}
</style>
