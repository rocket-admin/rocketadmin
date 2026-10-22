<script setup lang="ts">
// Port of connect-db/db-connection-delete-dialog: asks why the user leaves, deletes the connection
// and goes back to the connections list.
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { type SelectOption, UiField, UiRadioGroup, UiTextarea } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import { useConnectionsStore } from '@/stores/connections';
import { trackConnectionEvent } from './analytics';
import type { DbConnectionDeleteDialogData } from './dialogs';

const props = defineProps<{ data: DbConnectionDeleteDialogData }>();

const REASONS: SelectOption<string>[] = [
	{ value: 'missing-features', label: 'Missing features I need' },
	{ value: 'technical-issues', label: 'Technical issues' },
	{ value: 'another-product', label: 'Another product' },
	{ value: 'other', label: 'Other' },
];

const dialogRef = useDialogRef<void>();
const router = useRouter();
const connections = useConnectionsStore();

const connectionName = computed(() => props.data.title || props.data.database);
const reason = ref<string | null>(null);
const message = ref('');
const submitting = ref(false);

async function deleteConnection() {
	const id = props.data.id;
	if (!id) return;
	submitting.value = true;
	const metadata = { reason: reason.value ?? undefined, message: message.value || undefined };
	try {
		await connections.deleteConnection(id, metadata);
		trackConnectionEvent('Connect DB: connection is deleted', {
			id,
			title: props.data.title || null,
			reason: metadata.reason,
			message: metadata.message,
		});
		router.push('/connections-list');
		dialogRef.close();
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AppDialogForm
		:title="`Delete ${connectionName} connection`"
		submit-label="Proceed"
		cancel-label="Abort"
		submit-variant="danger"
		:busy="submitting"
		@submit="deleteConnection"
	>
		<p class="delete-connection__text">
			Before you delete the connection, please let us know why. Every bit of feedback helps!
		</p>
		<UiRadioGroup
			v-model="reason"
			class="delete-connection__reasons"
			name="reasons"
			aria-label="Reason for deleting the connection"
			:options="REASONS"
		/>
		<UiField label="Anything you want to share? (optional)">
			<UiTextarea v-model="message" name="message" :rows="8" />
		</UiField>
	</AppDialogForm>
</template>

<style scoped>
.delete-connection__text {
	margin: 0 0 var(--space-5);
}

.delete-connection__reasons {
	margin-bottom: var(--space-5);
}
</style>
