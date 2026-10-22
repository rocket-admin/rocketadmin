<script setup lang="ts">
// Port of db-tables-list/db-folder-delete-dialog: confirms deleting a sidebar folder. Closes with
// true on "Delete folder", false on "Cancel" (undefined on Escape/backdrop).
import AppDialog from '@/components/dialog/AppDialog.vue';
import { UiButton, UiIcon } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';

export interface FolderDeleteDialogData {
	folderName: string;
	tableCount: number;
}

defineProps<{ data: FolderDeleteDialogData }>();

const dialogRef = useDialogRef<boolean>();
</script>

<template>
	<AppDialog title="Delete folder" size="sm">
		<p class="folder-delete__message">
			Are you sure you want to delete the folder <strong>"{{ data.folderName }}"</strong>?
		</p>

		<div v-if="data.tableCount > 0" class="folder-delete__info">
			<UiIcon name="info" size="sm" class="folder-delete__info-icon" />
			<p class="folder-delete__info-text">
				This folder contains {{ data.tableCount }} table{{ data.tableCount > 1 ? 's' : '' }}. The tables will not be
				deleted, only removed from this folder.
			</p>
		</div>

		<template #footer>
			<UiButton variant="secondary" @click="dialogRef.close(false)">Cancel</UiButton>
			<UiButton variant="danger" @click="dialogRef.close(true)">Delete folder</UiButton>
		</template>
	</AppDialog>
</template>

<style scoped>
.folder-delete__message {
	margin: 0 0 var(--space-4);
}

.folder-delete__info {
	display: flex;
	align-items: flex-start;
	gap: var(--space-2);
	padding: var(--space-3);
	border-radius: var(--radius-control);
	background: var(--color-paper-2);
	color: var(--color-ink-soft);
}

.folder-delete__info-icon {
	flex-shrink: 0;
	color: var(--color-accent);
}

.folder-delete__info-text {
	margin: 0;
	font-size: var(--text-sm);
}
</style>
