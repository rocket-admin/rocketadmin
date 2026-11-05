<script setup lang="ts">
// Port of frontend/src/app/components/user-settings/account-delete-dialog: the "why are you
// leaving" survey. Submitting opens AccountDeleteConfirmationDialog with the answers and closes this one.
import { ref } from 'vue';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { UiField, UiRadio, UiRadioGroup, UiTextarea } from '@/components/ui';
import { useDialog, useDialogRef } from '@/composables/useDialog';
import type { User } from '@/models/user';
import AccountDeleteConfirmationDialog, { type AccountDeleteMetadata } from './AccountDeleteConfirmationDialog.vue';

const props = defineProps<{
	/** The signed-in user. */
	data: Pick<User, 'email'>;
}>();

type ReasonId = 'missing-features' | 'technical-issues' | 'another-product' | 'privacy-concern' | 'other';

const reasonsList: { id: ReasonId; caption: string }[] = [
	{ id: 'missing-features', caption: 'Missing features I need' },
	{ id: 'technical-issues', caption: 'Technical  issues' },
	{ id: 'another-product', caption: 'Another product' },
	{ id: 'privacy-concern', caption: 'I have privacy concern' },
	{ id: 'other', caption: 'Other' },
];

const dialog = useDialog();
const dialogRef = useDialogRef<void>();
const userEmail = props.data.email;
const reason = ref<ReasonId | null>(null);
const message = ref('');

function openDeleteConfirmation() {
	const metadata: AccountDeleteMetadata = { reason: reason.value, message: message.value };
	dialog.open(AccountDeleteConfirmationDialog, { data: metadata });
	dialogRef.close();
}
</script>

<template>
	<AppDialogForm
		:title="`Delete ${userEmail} account`"
		submit-label="Delete"
		submit-variant="danger"
		cancel-label="Abort"
		@submit="openDeleteConfirmation"
	>
		<p class="account-delete__intro">Tell us why are you deleting your account.</p>
		<UiRadioGroup v-model="reason" name="reasons" aria-label="Reason" required class="account-delete__reasons">
			<div v-for="reasonItem in reasonsList" :key="reasonItem.id" class="account-delete__reason">
				<UiRadio :value="reasonItem.id">{{ reasonItem.caption }}</UiRadio>
				<p v-if="reason === reasonItem.id && reasonItem.id !== 'other'" class="account-delete__message">
					<template v-if="reasonItem.id === 'missing-features'">
						Perhaps Rocketadmin has updated the functions you need and they are in a different place. Our
						<strong>Support team</strong> will advise you.
					</template>
					<template v-else-if="reasonItem.id === 'technical-issues'">
						If you have technical problems, please contact our <strong>Support team</strong> and we will solve your
						problem.
					</template>
					<template v-else-if="reasonItem.id === 'another-product'">
						If you are interested in another product, you can read
						<a href="https://help.rocketadmin.com/comparisons-with-other-database-admin-tools">the article</a> where
						they are compared.
					</template>
					<template v-else-if="reasonItem.id === 'privacy-concern'">
						If you have any doubts about the security of your data, please contact our <strong>Support team</strong>.
					</template>
				</p>
			</div>
		</UiRadioGroup>
		<UiField label="Anything you want to share? (optional)" class="account-delete__share">
			<UiTextarea v-model="message" name="message" :rows="3" />
		</UiField>
	</AppDialogForm>
</template>

<style scoped>
.account-delete__intro {
	margin: 0 0 var(--space-4);
}

.account-delete__reasons {
	display: flex;
	flex-direction: column;
	gap: var(--space-2);
}

.account-delete__message {
	margin: var(--space-1) 0 var(--space-2);
	font-size: var(--text-sm);
	color: var(--color-ink-soft);
}

.account-delete__share {
	margin-top: var(--space-4);
}
</style>
