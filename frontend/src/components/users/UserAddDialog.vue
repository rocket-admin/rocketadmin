<script setup lang="ts">
// Port of frontend/src/app/components/users/user-add-dialog: adds a company member to a group. With
// every member already in the group it points to the Company page instead.
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AppDialog from '@/components/dialog/AppDialog.vue';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { type SelectOption, UiButton, UiField, UiSelect } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import { useUsersStore } from '@/stores/users';
import { trackUsersEvent } from './analytics';
import type { UserAddDialogData } from './types';

const props = defineProps<{ data: UserAddDialogData }>();

const dialogRef = useDialogRef();
const users = useUsersStore();

const groupUserEmail = ref<string | null>(null);
const submitting = ref(false);

const title = computed(() => `Add user to ${props.data.group.title} group`);

const memberOptions = computed<SelectOption<string>[]>(() =>
	props.data.availableMembers.map((member) => ({
		value: member.email,
		label: member.name ? `${member.name} (${member.email})` : member.email,
	})),
);

function onSelect(value: string | string[] | null) {
	groupUserEmail.value = typeof value === 'string' ? value : null;
}

async function joinGroupUser() {
	if (!groupUserEmail.value) return;
	submitting.value = true;
	try {
		await users.addGroupUser(props.data.group.id, groupUserEmail.value);
		dialogRef.close();
		trackUsersEvent('User groups: user was added to group successfully');
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AppDialogForm
		v-if="data.availableMembers.length"
		:title="title"
		submit-label="Add"
		size="sm"
		:busy="submitting"
		:disabled="!groupUserEmail"
		@submit="joinGroupUser"
	>
		<UiField label="Select user" required>
			<UiSelect
				:model-value="groupUserEmail"
				:options="memberOptions"
				placeholder="Select user"
				name="email"
				@update:model-value="onSelect"
			/>
		</UiField>
		<p class="user-add__hint">
			Add users to the
			<RouterLink to="/company" class="user-add__link" @click="dialogRef.close()">Company</RouterLink>
			before assigning them to a group.
		</p>
	</AppDialogForm>

	<AppDialog v-else :title="title" size="sm">
		<p class="user-add__hint">
			All your company members are already in this group. To add a new one first add them to your company.
		</p>
		<template #footer>
			<UiButton variant="secondary" @click="dialogRef.close()">Cancel</UiButton>
			<UiButton to="/company" @click="dialogRef.close()">Open Company page</UiButton>
		</template>
	</AppDialog>
</template>

<style scoped>
.user-add__hint {
	margin: var(--space-3) 0 0;
	font-size: var(--text-sm);
}

.user-add__link {
	color: var(--color-accent);
}
</style>
