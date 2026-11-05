<script setup lang="ts">
/**
 * Port of dashboard/db-table-view/db-table-export-dialog: downloads the current table view (sort,
 * filters and search from the table) as `database.csv`, either the first N records or everything
 * up to 100 000.
 *
 * Opened with `useDialog().open(TableExportDialog, { data })`; closes with no result once the file
 * is downloaded. A failed export is reported by the tables store and leaves the dialog open.
 */
import posthog from 'posthog-js';
import { ref } from 'vue';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { UiInput, UiRadio, UiRadioGroup } from '@/components/ui';
import { trackEvent } from '@/composables/useAnalytics';
import { useDialogRef } from '@/composables/useDialog';
import { type ExportTableParams, useTablesStore } from '@/stores/tables';
import { downloadCsv } from './TableExportDialog.helpers';

export type TableExportDialogData = Omit<ExportTableParams, 'chunkSize' | 'sortOrder'> & {
	/** `sort.direction.toUpperCase()` in the table view: `ASC`, `DESC` or `''` when unsorted. */
	sortOrder?: string;
};

type ExportType = 'export-records-number' | 'export-all';

const props = defineProps<{
	/** The table view's query: connection, table, sort, filters and search. */
	data: TableExportDialogData;
}>();

const dialogRef = useDialogRef<void>();
const tables = useTablesStore();

const recordsNumber = ref<string | number>(10);
const recordsExportType = ref<ExportType>('export-all');
const submitting = ref(false);

async function exportCSV() {
	submitting.value = true;
	const chunkSize = recordsExportType.value === 'export-all' ? 100000 : Number(recordsNumber.value);
	const sortOrder =
		props.data.sortOrder === 'ASC' || props.data.sortOrder === 'DESC' ? props.data.sortOrder : undefined;
	try {
		const csv = await tables.exportTableCSV({ ...props.data, sortOrder, chunkSize });
		downloadCsv(csv);
		dialogRef.close();
		trackEvent('Dashboard: db export is successful');
		posthog.capture('Dashboard: db export is successful');
	} catch {
		// Reported by the store.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AppDialogForm title="Export" submit-label="Export" size="sm" :busy="submitting" @submit="exportCSV">
		<p class="table-export__text">Select number of records you want to download.</p>
		<UiRadioGroup v-model="recordsExportType" name="selectedPages" aria-label="Number of records to export">
			<div class="table-export__records">
				<UiRadio value="export-records-number">Number of records</UiRadio>
				<UiInput
					v-model="recordsNumber"
					class="table-export__number"
					type="number"
					name="records-number"
					aria-label="Number of records"
					:disabled="submitting || recordsExportType !== 'export-records-number'"
				/>
			</div>
			<UiRadio value="export-all">Export all (up to 100 000 records)</UiRadio>
		</UiRadioGroup>
	</AppDialogForm>
</template>

<style scoped>
.table-export__text {
  margin: 0 0 var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-ink-soft);
}

.table-export__records {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.table-export__number {
  width: 8rem;
}
</style>
