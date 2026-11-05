<script setup lang="ts">
// Port of frontend/src/app/components/company/revoke-invitation-dialog: revokes a pending
// invitation. The store refreshes the company and its members.
import { ref } from 'vue';
import { trackAuthEvent } from '@/components/auth/analytics';
import AppDialog from '@/components/dialog/AppDialog.vue';
import { UiButton } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import { useCompanyStore } from '@/stores/company';

export interface RevokeInvitationDialogData {
	companyId: string;
	userEmail: string;
}

const props = defineProps<{ data: RevokeInvitationDialogData }>();

const dialogRef = useDialogRef<void>();
const companyStore = useCompanyStore();
const submitting = ref(false);

async function revokeInvitation() {
	submitting.value = true;
	try {
		await companyStore.revokeInvitation(props.data.companyId, props.data.userEmail);
		trackAuthEvent('Company: invitation is revoked successfully');
		dialogRef.close();
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AppDialog title="Revoke email invitation" size="sm" :dismissible="!submitting">
		<p class="company-dialog__text">
			You are going to revoke invitation from <strong>{{ data.userEmail }}</strong> email.
		</p>
		<p class="company-dialog__text">Please confirm.</p>
		<template #footer>
			<UiButton variant="secondary" :disabled="submitting" @click="dialogRef.close()">Cancel</UiButton>
			<UiButton variant="danger" :disabled="submitting" @click="revokeInvitation">Revoke</UiButton>
		</template>
	</AppDialog>
</template>

<style scoped>
.company-dialog__text {
	margin: 0 0 var(--space-4);
}
</style>
