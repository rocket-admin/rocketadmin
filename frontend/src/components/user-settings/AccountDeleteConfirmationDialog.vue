<script setup lang="ts">
// Port of frontend/src/app/components/user-settings/account-delete-confirmation: the last "are you
// sure" before PUT /user/delete. The store logs out and navigates to /deleted on success.
import { ref } from 'vue';
import { trackAuthEvent } from '@/components/auth/analytics';
import AppDialog from '@/components/dialog/AppDialog.vue';
import { UiButton } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import { useUserStore } from '@/stores/user';

export interface AccountDeleteMetadata {
	reason: string | null;
	message: string;
	email?: string;
}

const props = defineProps<{
	/** The reason survey filled in the previous dialog. */
	data: AccountDeleteMetadata;
}>();

const dialogRef = useDialogRef<void>();
const userStore = useUserStore();
const submitting = ref(false);

async function deleteAccount() {
	submitting.value = true;
	try {
		await userStore.deleteAccount({ ...props.data });
		trackAuthEvent('Delete account', {
			email: props.data.email,
			reason: props.data.reason,
			message: props.data.message,
		});
		dialogRef.close();
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AppDialog title="Are you sure?" size="sm" :dismissible="!submitting">
		<p class="account-delete-confirmation__text">
			This action is permanent and irreversible, you will not be able to restore your account in the future
		</p>
		<template #footer>
			<UiButton variant="secondary" :disabled="submitting" @click="dialogRef.close()">Cancel</UiButton>
			<UiButton variant="danger" :loading="submitting" @click="deleteAccount">Yes, delete</UiButton>
		</template>
	</AppDialog>
</template>

<style scoped>
.account-delete-confirmation__text {
	margin: 0;
}
</style>
