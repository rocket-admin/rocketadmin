<script setup lang="ts">
// Port of frontend/src/app/components/dashboard/db-table-view/db-table-actions/action-delete-dialog:
// confirms deleting a saved automation. The store's `ruleDeleted` event makes the page reload its
// rules; the dialog closes with `true` once deleted and stays open on failure (the store shows it).
import { ref } from 'vue';
import AppDialog from '@/components/dialog/AppDialog.vue';
import { UiButton } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import type { Rule } from '@/models/table';
import { useTablesStore } from '@/stores/tables';

export interface ActionDeleteDialogData {
	connectionID: string;
	tableName: string;
	rule: Pick<Rule, 'id' | 'title'> | null;
}

const props = defineProps<{ data: ActionDeleteDialogData }>();

const dialogRef = useDialogRef<boolean>();
const tables = useTablesStore();
const submitting = ref(false);

async function deleteAction() {
	const id = props.data.rule?.id;
	if (!id || submitting.value) return;
	submitting.value = true;
	try {
		await tables.deleteRule(props.data.connectionID, props.data.tableName, id);
		dialogRef.close(true);
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AppDialog title="Confirm action delete" size="sm" :dismissible="!submitting" data-testid="action-delete-dialog">
		<p class="action-delete__text">
			You are going to delete <strong>{{ data.rule?.title }}</strong> action.
		</p>
		<p class="action-delete__text">Please confirm.</p>
		<template #footer>
			<UiButton variant="secondary" :disabled="submitting" @click="dialogRef.close()">Cancel</UiButton>
			<UiButton variant="danger" :loading="submitting" data-testid="action-delete-confirm-button" @click="deleteAction">
				Delete
			</UiButton>
		</template>
	</AppDialog>
</template>

<style scoped>
.action-delete__text {
	margin: 0 0 var(--space-3);
}
</style>
