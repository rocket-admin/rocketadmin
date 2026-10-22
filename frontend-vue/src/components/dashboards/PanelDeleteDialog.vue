<script setup lang="ts">
// Port of frontend/src/app/components/dashboards/panel-delete-dialog: confirms removing a panel
// (widget) from a dashboard and closes with `true`, so the dashboard reloads.
import { ref } from 'vue';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { useDialogRef } from '@/composables/useDialog';
import type { DashboardWidget } from '@/models/dashboard';
import { useDashboardsStore } from '@/stores/dashboards';
import { trackDashboardsEvent } from './analytics';
import DeleteWarning from './DeleteWarning.vue';

const props = defineProps<{ data: { connectionId: string; dashboardId: string; widget: DashboardWidget } }>();

const dialogRef = useDialogRef<boolean>();
const dashboards = useDashboardsStore();
const submitting = ref(false);

async function onDelete(): Promise<void> {
	submitting.value = true;
	try {
		const result = await dashboards.deleteWidget(props.data.connectionId, props.data.dashboardId, props.data.widget.id);
		if (result) {
			trackDashboardsEvent('Dashboards: panel deleted successfully');
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
		title="Delete panel"
		size="sm"
		submit-variant="danger"
		:submit-label="submitting ? 'Deleting...' : 'Delete panel'"
		:busy="submitting"
		@submit="onDelete"
	>
		<DeleteWarning details="This action cannot be undone. The panel will be permanently removed from the dashboard.">
			Are you sure you want to delete this panel?
		</DeleteWarning>
	</AppDialogForm>
</template>
