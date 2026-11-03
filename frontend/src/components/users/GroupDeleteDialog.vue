<script setup lang="ts">
// Port of frontend/src/app/components/users/group-delete-dialog: confirms and deletes a user group.
import { ref } from 'vue';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { useDialogRef } from '@/composables/useDialog';
import { useUsersStore } from '@/stores/users';
import { trackUsersEvent } from './analytics';
import type { GroupRef } from './types';

const props = defineProps<{ data: GroupRef }>();

const dialogRef = useDialogRef();
const users = useUsersStore();
const submitting = ref(false);

async function deleteUsersGroup() {
	submitting.value = true;
	try {
		await users.deleteGroup(props.data.id);
		dialogRef.close();
		trackUsersEvent('User groups: user group was deleted successfully');
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AppDialogForm
		title="Confirm users group delete"
		submit-label="Delete"
		submit-variant="danger"
		size="sm"
		:busy="submitting"
		@submit="deleteUsersGroup"
	>
		<p class="group-delete__text">
			You are going to delete <strong>{{ data.title }}</strong> group.
		</p>
		<p class="group-delete__text">Please confirm.</p>
	</AppDialogForm>
</template>

<style scoped>
.group-delete__text {
	margin: 0 0 var(--space-3);
}
</style>
