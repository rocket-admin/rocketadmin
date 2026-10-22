<script setup lang="ts">
// Port of frontend/src/app/components/users/user-delete-dialog: removes a user from a group.
import { ref } from 'vue';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { useDialogRef } from '@/composables/useDialog';
import { useUsersStore } from '@/stores/users';
import type { UserDeleteDialogData } from './types';

const props = defineProps<{ data: UserDeleteDialogData }>();

const dialogRef = useDialogRef();
const users = useUsersStore();
const submitting = ref(false);

async function deleteGroupUser() {
	submitting.value = true;
	try {
		await users.deleteGroupUser(props.data.user.email, props.data.group.id);
		dialogRef.close();
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AppDialogForm
		title="Confirm users delete"
		submit-label="Delete"
		submit-variant="danger"
		size="sm"
		:busy="submitting"
		@submit="deleteGroupUser"
	>
		<p class="user-delete__text">
			You are going to delete
			<template v-if="data.user.name">
				<strong>{{ data.user.name }}</strong> ({{ data.user.email }})
			</template>
			<strong v-else>{{ data.user.email }}</strong>
			from <strong>{{ data.group.title }}</strong> group.
		</p>
		<p class="user-delete__text">Please confirm.</p>
	</AppDialogForm>
</template>

<style scoped>
.user-delete__text {
	margin: 0 0 var(--space-3);
}
</style>
