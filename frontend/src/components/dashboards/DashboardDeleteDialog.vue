<script setup lang="ts">
// Port of frontend/src/app/components/dashboards/dashboard-delete-dialog: confirms deleting a
// dashboard and closes with `true` once it is gone. The store refreshes the dashboards list.
import { ref } from 'vue';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { useDialogRef } from '@/composables/useDialog';
import type { Dashboard } from '@/models/dashboard';
import { useDashboardsStore } from '@/stores/dashboards';
import { trackDashboardsEvent } from './analytics';
import DeleteWarning from './DeleteWarning.vue';

const props = defineProps<{ data: { dashboard: Dashboard; connectionId: string } }>();

const dialogRef = useDialogRef<boolean>();
const dashboards = useDashboardsStore();
const submitting = ref(false);

async function onDelete(): Promise<void> {
	submitting.value = true;
	try {
		const result = await dashboards.deleteDashboard(props.data.connectionId, props.data.dashboard.id);
		if (result) {
			trackDashboardsEvent('Dashboards: dashboard deleted successfully');
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
		title="Delete dashboard"
		size="sm"
		submit-variant="danger"
		:submit-label="submitting ? 'Deleting...' : 'Delete dashboard'"
		:busy="submitting"
		@submit="onDelete"
	>
		<DeleteWarning details="This action cannot be undone. The dashboard and all its widgets will be permanently removed.">
			Are you sure you want to delete the dashboard <strong>{{ data.dashboard.name }}</strong>?
		</DeleteWarning>
	</AppDialogForm>
</template>
