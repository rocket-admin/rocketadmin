<script setup lang="ts">
// Port of frontend/src/app/components/company/delete-domain-dialog: removes the company's custom
// domain (SaaS). The store refreshes the custom domain.
import { ref } from 'vue';
import { trackAuthEvent } from '@/components/auth/analytics';
import AppDialog from '@/components/dialog/AppDialog.vue';
import { UiButton } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import { useCompanyStore } from '@/stores/company';

export interface DeleteDomainDialogData {
	companyId: string;
	domain: string;
}

const props = defineProps<{ data: DeleteDomainDialogData }>();

const dialogRef = useDialogRef<void>();
const companyStore = useCompanyStore();
const submitting = ref(false);

async function deleteCompanyDomain() {
	submitting.value = true;
	try {
		await companyStore.deleteCustomDomain(props.data.companyId);
		trackAuthEvent('Company: domain is deleted successfully');
		dialogRef.close();
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AppDialog title="Confirm domain deletion" size="sm" :dismissible="!submitting">
		<p class="company-dialog__text">You are about to remove {{ data.domain }} from your company</p>
		<p class="company-dialog__text">
			Once deleted, users will no longer be able to access the admin panel via this domain — please notify them in
			advance.
		</p>
		<p class="company-dialog__text">Are you sure you want to proceed?</p>
		<template #footer>
			<UiButton variant="secondary" :disabled="submitting" @click="dialogRef.close()">Cancel</UiButton>
			<UiButton variant="danger" :disabled="submitting" @click="deleteCompanyDomain">Delete</UiButton>
		</template>
	</AppDialog>
</template>

<style scoped>
.company-dialog__text {
	margin: 0 0 var(--space-4);
}
</style>
