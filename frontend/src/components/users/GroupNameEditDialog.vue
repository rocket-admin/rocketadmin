<script setup lang="ts">
// Port of frontend/src/app/components/users/group-name-edit-dialog: renames a user group.
import { computed, ref } from 'vue';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { UiField, UiInput } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import { useUsersStore } from '@/stores/users';
import type { GroupRef } from './types';

const props = defineProps<{ data: GroupRef }>();

const dialogRef = useDialogRef();
const users = useUsersStore();

const groupTitle = ref(props.data.title);
const touched = ref(false);
const submitting = ref(false);

const titleError = computed(() => (touched.value && !groupTitle.value ? 'Title should not be empty.' : undefined));

async function editGroupName() {
	submitting.value = true;
	try {
		await users.editGroupName(props.data.id, groupTitle.value);
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
		title="Change group name"
		submit-label="Change"
		size="sm"
		:busy="submitting"
		:disabled="!groupTitle"
		@submit="editGroupName"
	>
		<UiField label="Change group name" :error="titleError" required>
			<UiInput v-model="groupTitle" name="title" required @blur="touched = true" />
		</UiField>
	</AppDialogForm>
</template>
