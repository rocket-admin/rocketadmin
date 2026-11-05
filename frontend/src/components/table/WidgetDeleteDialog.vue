<script setup lang="ts">
// Port of frontend/src/app/components/dashboard/db-table-view/db-table-widgets/widget-delete-dialog:
// confirms deleting one column's widget (`data` is the column name) or, without data, all widgets.
// Closes with 'delete' when confirmed; the page then saves the remaining widgets.
import AppDialog from '@/components/dialog/AppDialog.vue';
import { UiButton } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';

defineProps<{ data?: string | null }>();

const dialogRef = useDialogRef<'delete'>();
</script>

<template>
	<AppDialog title="Confirm widget delete" size="sm" data-testid="widget-delete-dialog">
		<p v-if="data" class="widget-delete__text">
			You are going to delete widget for <strong>{{ data }}</strong> field.
		</p>
		<p v-else class="widget-delete__text">Do you want to delete all widgets?</p>
		<p class="widget-delete__text">Please confirm.</p>
		<template #footer>
			<UiButton variant="secondary" @click="dialogRef.close()">Cancel</UiButton>
			<UiButton variant="danger" data-testid="widget-delete-confirm-button" @click="dialogRef.close('delete')">
				Delete
			</UiButton>
		</template>
	</AppDialog>
</template>

<style scoped>
.widget-delete__text {
	margin: 0 0 var(--space-3);
}
</style>
