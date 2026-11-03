<script setup lang="ts">
// Port of frontend/src/app/components/user-settings/enable-two-fa-dialog: shows the QR code from
// POST /user/otp/generate and verifies the first authenticator code.
//
// Closes with 'enable' when the code is validated and with 'error' when the check fails (Angular
// closed on click and emitted `confirm2FAerror`); either way the page knows whether 2FA is now on.
import { ref } from 'vue';
import { trackAuthEvent } from '@/components/auth/analytics';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { UiField, UiInput } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import { useUserStore } from '@/stores/user';

export type EnableTwoFaResult = 'enable' | 'error';

defineProps<{
	/** The QR code image (a data URL). */
	data: string;
}>();

const dialogRef = useDialogRef<EnableTwoFaResult>();
const userStore = useUserStore();
const code = ref('');
const submitting = ref(false);

async function verify2FA() {
	submitting.value = true;
	try {
		const response = (await userStore.confirm2FA(code.value)) as { validated?: boolean } | null;
		if (response?.validated) {
			code.value = '';
			trackAuthEvent('User settings: 2fa enabled successfully');
			dialogRef.close('enable');
		}
	} catch {
		dialogRef.close('error');
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AppDialogForm
		title="Enable 2FA"
		submit-label="Enable"
		:busy="submitting"
		:disabled="!code"
		@submit="verify2FA"
	>
		<p class="enable-two-fa__text">Scan this QR code with 2FA application</p>
		<img :src="data" class="enable-two-fa__qr" alt="qr">
		<UiField label="Enter the code from your authenticator" required>
			<UiInput v-model="code" name="code" autocomplete="one-time-code" />
		</UiField>
	</AppDialogForm>
</template>

<style scoped>
.enable-two-fa__text {
	margin: 0 0 var(--space-3);
}

.enable-two-fa__qr {
	display: block;
	margin-bottom: var(--space-4);
}
</style>
