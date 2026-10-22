<script setup lang="ts">
// Port of frontend/src/app/components/user-settings/api-key-delete-dialog: confirms deleting an API
// key. Closes with 'delete' once the key is deleted (Angular closed on click, before the request
// finished, so the list could refetch too early).
import { ref } from 'vue';
import AppDialog from '@/components/dialog/AppDialog.vue';
import { UiButton } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import type { ApiKey } from '@/models/user';
import { useUserStore } from '@/stores/user';

const props = defineProps<{
	/** The key to delete. */
	data: ApiKey;
}>();

const dialogRef = useDialogRef<'delete'>();
const userStore = useUserStore();
const submitting = ref(false);

async function deleteAPIkey() {
	submitting.value = true;
	try {
		await userStore.deleteAPIkey(props.data);
		dialogRef.close('delete');
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AppDialog title="Confirm API key delete" size="sm" :dismissible="!submitting">
		<p class="api-key-delete__text">You are going to delete <strong>{{ data.title }}</strong> API key.</p>
		<p class="api-key-delete__text">Please confirm.</p>
		<template #footer>
			<UiButton variant="secondary" :disabled="submitting" @click="dialogRef.close()">Cancel</UiButton>
			<UiButton variant="danger" :loading="submitting" @click="deleteAPIkey">Delete</UiButton>
		</template>
	</AppDialog>
</template>

<style scoped>
.api-key-delete__text {
	margin: 0 0 var(--space-4);
}
</style>
