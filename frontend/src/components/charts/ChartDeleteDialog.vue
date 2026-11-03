<script setup lang="ts">
// Port of frontend/src/app/components/charts/chart-delete-dialog: confirms deleting a saved query
// (a panel) and closes with `true` once it is gone. The store refreshes the panels list.
import { ref } from 'vue';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { useDialogRef } from '@/composables/useDialog';
import type { SavedQuery } from '@/models/saved-query';
import { useSavedQueriesStore } from '@/stores/saved-queries';
import { trackDashboardsEvent } from '../dashboards/analytics';
import DeleteWarning from '../dashboards/DeleteWarning.vue';

const props = defineProps<{ data: { query: SavedQuery; connectionId: string } }>();

const dialogRef = useDialogRef<boolean>();
const savedQueries = useSavedQueriesStore();
const submitting = ref(false);

async function onDelete(): Promise<void> {
	submitting.value = true;
	try {
		const result = await savedQueries.deleteSavedQuery(props.data.connectionId, props.data.query.id);
		if (result) {
			trackDashboardsEvent('Charts: saved query deleted successfully');
			dialogRef.close(true);
		}
	} catch {
		// The client has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AppDialogForm
		title="Delete saved query"
		size="sm"
		submit-variant="danger"
		:submit-label="submitting ? 'Deleting...' : 'Delete query'"
		:busy="submitting"
		data-testid="delete-chart-dialog"
		@submit="onDelete"
	>
		<DeleteWarning details="This action cannot be undone. The query and its configuration will be permanently removed.">
			Are you sure you want to delete the query <strong>{{ data.query.name }}</strong>?
		</DeleteWarning>
	</AppDialogForm>
</template>
