<script setup lang="ts">
// Port of frontend/src/app/components/company/delete-member-dialog: removes a member from the
// company. The store refreshes the members list.
import { ref } from 'vue';
import { trackAuthEvent } from '@/components/auth/analytics';
import AppDialog from '@/components/dialog/AppDialog.vue';
import { UiButton } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import type { CompanyMember } from '@/models/company';
import { useCompanyStore } from '@/stores/company';

export interface DeleteMemberDialogData {
	companyId: string;
	user: Pick<CompanyMember, 'id' | 'email' | 'name'>;
}

const props = defineProps<{ data: DeleteMemberDialogData }>();

const dialogRef = useDialogRef<void>();
const companyStore = useCompanyStore();
const submitting = ref(false);

async function deleteCompanyMember() {
	const { companyId, user } = props.data;
	submitting.value = true;
	try {
		await companyStore.removeCompanyMember(companyId, user.id, user.email, user.name);
		trackAuthEvent('Company: member is deleted successfully');
		dialogRef.close();
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AppDialog title="Confirm member delete" size="sm" :dismissible="!submitting">
		<p class="company-dialog__text">
			You are going to delete <strong>{{ data.user.name || data.user.email }}</strong> from your company.
		</p>
		<p class="company-dialog__text">Please confirm.</p>
		<template #footer>
			<UiButton variant="secondary" :disabled="submitting" @click="dialogRef.close()">Cancel</UiButton>
			<UiButton variant="danger" :disabled="submitting" @click="deleteCompanyMember">Delete</UiButton>
		</template>
	</AppDialog>
</template>

<style scoped>
.company-dialog__text {
	margin: 0 0 var(--space-4);
}
</style>
