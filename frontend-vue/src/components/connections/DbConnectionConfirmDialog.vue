<script setup lang="ts">
// Port of connect-db/db-connection-confirm-dialog: the automatic test before saving failed. Save
// (or add) the connection anyway, keep editing, or get help.
import { useRouter } from 'vue-router';
import AppDialog from '@/components/dialog/AppDialog.vue';
import { UiButton } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import { environment } from '@/environment';
import { useConnectionsStore } from '@/stores/connections';
import type { DbConnectionConfirmDialogData } from './dialogs';
import { PROVIDER_DOCS_LINKS, PROVIDER_NAMES } from './provider';

const props = defineProps<{ data: DbConnectionConfirmDialogData }>();

const dialogRef = useDialogRef<string>();
const router = useRouter();
const connections = useConnectionsStore();
const isSaas = environment.saas;

async function editConnection() {
	dialogRef.close();
	try {
		await connections.updateConnection(props.data.dbCreds, props.data.masterKey ?? '');
		router.push(`/dashboard/${props.data.dbCreds.id}`);
	} catch {
		// The store has shown the error.
	}
}

async function createConnection() {
	dialogRef.close();
	try {
		const res = await connections.createConnection(props.data.dbCreds, props.data.masterKey ?? '');
		router.push(`/dashboard/${res.id}`);
	} catch {
		// The store has shown the error.
	}
}

function openIntercom() {
	window.Intercom?.('show');
}
</script>

<template>
	<AppDialog title="Connection error" size="md">
		<p class="confirm-dialog__text">Connection does not exist or credentials are incorrect.</p>
		<strong class="confirm-dialog__error">Error: {{ data.errorMessage }}</strong>

		<div v-if="data.provider" class="confirm-dialog__docs">
			Need help with {{ PROVIDER_NAMES[data.provider] }} integration?
			<a :href="PROVIDER_DOCS_LINKS[data.provider]" target="_blank" rel="noopener" class="confirm-dialog__docs-link">
				Open docs
			</a>
		</div>

		<template #footer>
			<div class="confirm-dialog__actions">
				<UiButton v-if="data.dbCreds?.id" variant="ghost" @click="editConnection">Save anyway</UiButton>
				<UiButton v-else variant="ghost" @click="createConnection">Add anyway</UiButton>

				<div class="confirm-dialog__main-actions">
					<UiButton variant="secondary" @click="dialogRef.close('change')">Keep editing</UiButton>
					<UiButton v-if="isSaas" @click="openIntercom">Chat with support</UiButton>
					<UiButton v-else href="https://github.com/rocket-admin/rocketadmin/issues" target="_blank" rel="noopener">
						Report a bug
					</UiButton>
				</div>
			</div>
		</template>
	</AppDialog>
</template>

<style scoped>
.confirm-dialog__text {
	margin: 0 0 var(--space-3);
}

.confirm-dialog__error {
	display: block;
	margin-bottom: var(--space-5);
	color: var(--color-ink);
	overflow-wrap: anywhere;
}

.confirm-dialog__docs {
	margin-bottom: var(--space-5);
	padding: var(--space-2) var(--space-3);
	border-radius: var(--radius-control);
	background-color: var(--color-paper-2);
}

.confirm-dialog__docs-link {
	color: var(--color-accent);
	font-weight: var(--weight-medium);
	text-decoration: none;
}

.confirm-dialog__actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	gap: var(--space-3);
	width: 100%;
}

.confirm-dialog__main-actions {
	display: flex;
	gap: var(--space-3);
}
</style>
