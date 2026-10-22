<script setup lang="ts">
/**
 * Port of dashboard/db-table-view/db-table-import-dialog: uploads a CSV file into the table.
 *
 * Opened with `useDialog().open(TableImportDialog, { data })`; closes with no result once the import
 * succeeds (the tables store shows the success snackbar and emits `imported`, which the table view
 * listens to). A failed import is reported by the store and leaves the dialog open.
 */
import posthog from 'posthog-js';
import { ref } from 'vue';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { UiButton } from '@/components/ui';
import { trackEvent } from '@/composables/useAnalytics';
import { useDialogRef } from '@/composables/useDialog';
import { useTablesStore } from '@/stores/tables';

export interface TableImportDialogData {
	connectionID: string;
	tableName: string;
	/** A public demo database: warns against importing sensitive data. */
	isTestConnection?: boolean;
}

const props = defineProps<{
	data: TableImportDialogData;
}>();

const dialogRef = useDialogRef<void>();
const tables = useTablesStore();

const fileInput = ref<HTMLInputElement | null>(null);
const file = ref<File | null>(null);
const submitting = ref(false);

function onFileSelected(event: Event) {
	file.value = (event.target as HTMLInputElement).files?.[0] ?? null;
}

async function importCSV() {
	// Angular posted an empty form without a file, which the server rejected.
	if (!file.value) return;
	submitting.value = true;
	try {
		await tables.importTableCSV(props.data.connectionID, props.data.tableName, file.value);
		dialogRef.close();
		trackEvent('Dashboard: db import is successful');
		posthog.capture('Dashboard: db import is successful');
	} catch {
		// Reported by the store.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AppDialogForm title="Import" submit-label="Import" size="sm" :busy="submitting" @submit="importCSV">
		<p v-if="data.isTestConnection" class="table-import__warning">
			This is a <strong>TEST DATABASE</strong>, public to all. Avoid importing sensitive data!
		</p>
		<div class="table-import__file">
			<UiButton variant="secondary" @click="fileInput?.click()">Browse File</UiButton>
			<span class="table-import__file-name">{{ file && file.name ? file.name : 'No file selected.' }}</span>
			<input
				ref="fileInput"
				type="file"
				class="table-import__input"
				name="db-table-file"
				aria-label="CSV file"
				hidden
				@change="onFileSelected"
			>
		</div>
	</AppDialogForm>
</template>

<style scoped>
.table-import__warning {
  margin: 0 0 var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-warning);
}

.table-import__file {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.table-import__file-name {
  font-size: var(--text-sm);
  font-style: italic;
  color: var(--color-muted);
  overflow-wrap: anywhere;
}
</style>
