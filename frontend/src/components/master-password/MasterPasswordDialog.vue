<script setup lang="ts">
/**
 * Port of frontend/src/app/components/master-password-dialog: asks for the master password of a
 * connection with client-side encryption, stores it and reloads the page so it is sent.
 *
 * Opened through `useMasterPasswordStore().showMasterPasswordDialog()`. Like Angular's
 * `disableClose: true`, Escape and the backdrop do nothing; only Cancel and Submit close it.
 */
import { ref } from 'vue';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { UiField, UiInput } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import { type MasterPasswordDialogData, useMasterPasswordStore } from '@/stores/master-password';

const props = defineProps<{
	/** The connection the password belongs to. */
	data: MasterPasswordDialogData;
}>();

const dialogRef = useDialogRef<void>();
const masterPassword = useMasterPasswordStore();
const password = ref('');

function enterMasterPassword() {
	masterPassword.saveMasterPassword(props.data.connectionId, password.value);
	dialogRef.close();
}
</script>

<template>
	<AppDialogForm
		title="Enter Master Password"
		submit-label="Submit"
		size="sm"
		:dismissible="false"
		@submit="enterMasterPassword"
	>
		<UiField label="Password" required>
			<UiInput v-model="password" type="password" name="password" autocomplete="current-password" />
		</UiField>
	</AppDialogForm>
</template>
