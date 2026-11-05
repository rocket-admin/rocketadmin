<script setup lang="ts">
// Port of frontend/src/app/components/users/group-add-dialog: creates a user group in the current
// connection and closes with the new group, so the permissions page can open its policy editor.
import { computed, ref } from 'vue';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { UiField, UiInput } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import type { UserGroup } from '@/models/user';
import { useConnectionsStore } from '@/stores/connections';
import { useUsersStore } from '@/stores/users';
import { trackUsersEvent } from './analytics';

const dialogRef = useDialogRef<UserGroup | null>();
const connections = useConnectionsStore();
const users = useUsersStore();

const groupTitle = ref('');
const touched = ref(false);
const submitting = ref(false);

const titleError = computed(() => (touched.value && !groupTitle.value ? 'Title should not be empty.' : undefined));

async function addGroup() {
	submitting.value = true;
	try {
		const group = await users.createGroup(connections.connectionID ?? '', groupTitle.value);
		dialogRef.close(group);
		trackUsersEvent('User groups: user groups was created successfully');
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AppDialogForm
		title="Create group of users"
		submit-label="Create"
		size="sm"
		:busy="submitting"
		:disabled="!groupTitle"
		@submit="addGroup"
	>
		<UiField label="Enter group title" :error="titleError" required>
			<UiInput v-model="groupTitle" name="title" required data-testid="group-title-input" @blur="touched = true" />
		</UiField>
	</AppDialogForm>
</template>
