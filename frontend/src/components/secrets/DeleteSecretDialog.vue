<script setup lang="ts">
// Port of frontend/src/app/components/secrets/delete-secret-dialog: confirms deleting a secret and
// its audit log. Closes with `true` once deleted; stays open on failure (the store shows the error).
import { ref } from 'vue';
import AppDialog from '@/components/dialog/AppDialog.vue';
import { UiButton, UiIcon } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import type { Secret } from '@/models/secret';
import { useSecretsStore } from '@/stores/secrets';
import { trackSecretsEvent } from './secretUtils';

export interface DeleteSecretDialogData {
	secret: Secret;
}

const props = defineProps<{ data: DeleteSecretDialogData }>();

const dialogRef = useDialogRef<boolean>();
const secrets = useSecretsStore();
const submitting = ref(false);

async function onDelete() {
	if (submitting.value) return;
	submitting.value = true;
	try {
		await secrets.deleteSecret(props.data.secret.slug);
		trackSecretsEvent('Secrets: secret deleted successfully');
		dialogRef.close(true);
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AppDialog title="Delete Secret" size="sm" :dismissible="!submitting" data-testid="delete-secret-dialog">
		<div class="delete-secret">
			<UiIcon name="warning" size="lg" class="delete-secret__icon" />
			<div class="delete-secret__content">
				<p class="delete-secret__question">
					Are you sure you want to delete the secret with identifier <strong>{{ data.secret.slug }}</strong>?
				</p>
				<p class="delete-secret__details">
					This action cannot be undone. The secret value and all associated audit logs will be permanently removed.
				</p>
			</div>
		</div>
		<template #footer>
			<UiButton variant="secondary" :disabled="submitting" @click="dialogRef.close()">Cancel</UiButton>
			<UiButton variant="danger" :loading="submitting" data-testid="delete-secret-confirm-button" @click="onDelete">
				{{ submitting ? 'Deleting...' : 'Delete Secret' }}
			</UiButton>
		</template>
	</AppDialog>
</template>

<style scoped>
.delete-secret {
	display: flex;
	gap: var(--space-4);
	padding: var(--space-4);
	border: 1px solid var(--color-warning-border);
	border-radius: var(--radius-card);
	background: var(--color-warning-bg);
}

.delete-secret__icon {
	flex: none;
	color: var(--color-warning);
}

.delete-secret__question {
	margin: 0 0 var(--space-2);
}

.delete-secret__details {
	margin: 0;
	font-size: var(--text-sm);
	color: var(--color-muted);
}
</style>
