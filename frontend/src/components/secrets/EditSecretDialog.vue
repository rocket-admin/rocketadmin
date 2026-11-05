<script setup lang="ts">
// Port of frontend/src/app/components/secrets/edit-secret-dialog: replaces a secret's value (the
// current one is never shown) and changes or removes its expiration date. A secret with master
// encryption needs its master password; a 403 means it was wrong. Closes with `true` once saved.
import { computed, ref } from 'vue';
import { isApiError } from '@/api/client';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { UiCheckbox, UiField, UiIcon, UiIconButton, UiInput, UiTextarea } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import type { Secret } from '@/models/secret';
import { useSecretsStore } from '@/stores/secrets';
import { dateInputToIso, toDateInputValue, trackSecretsEvent } from './secretUtils';

export interface EditSecretDialogData {
	secret: Secret;
}

const props = defineProps<{ data: EditSecretDialogData }>();

const dialogRef = useDialogRef<boolean>();
const secrets = useSecretsStore();

const initialExpiresAt = props.data.secret.expiresAt ? toDateInputValue(new Date(props.data.secret.expiresAt)) : '';

const value = ref('');
const expiresAt = ref(initialExpiresAt);
const clearExpiration = ref(false);
const masterPassword = ref('');
const masterPasswordError = ref('');

const submitting = ref(false);
const showValue = ref(false);
const showMasterPassword = ref(false);
const valueTouched = ref(false);
const minDate = toDateInputValue(new Date());

const valueError = computed(() => {
	if (!value.value) return 'New value is required';
	if (value.value.length > 10000) return 'Value must be 10000 characters or less';
	return '';
});

/** The date to send: the stored timestamp as is while the date is untouched, else local midnight. */
function expiresAtPayload(): string | null | undefined {
	if (clearExpiration.value) return null;
	if (!expiresAt.value) return undefined;
	if (expiresAt.value === initialExpiresAt && props.data.secret.expiresAt) {
		return new Date(props.data.secret.expiresAt).toISOString();
	}
	return dateInputToIso(expiresAt.value);
}

async function onSubmit() {
	if (valueError.value) return;
	const { secret } = props.data;
	if (secret.masterEncryption && !masterPassword.value) {
		masterPasswordError.value = 'Master password is required';
		return;
	}

	submitting.value = true;
	try {
		await secrets.updateSecret(
			secret.slug,
			{ value: value.value, expiresAt: expiresAtPayload() },
			secret.masterEncryption ? masterPassword.value : undefined,
		);
		trackSecretsEvent('Secrets: secret updated successfully');
		dialogRef.close(true);
	} catch (error) {
		// Other errors were shown by the store.
		if (isApiError(error) && error.status === 403) masterPasswordError.value = 'Invalid master password';
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AppDialogForm
		:title="`Edit Secret: ${data.secret.slug}`"
		:submit-label="submitting ? 'Saving...' : 'Save Changes'"
		:busy="submitting"
		:disabled="Boolean(valueError)"
		data-testid="edit-secret-dialog"
		@submit="onSubmit"
	>
		<div class="edit-secret">
			<p class="edit-secret__note">
				<UiIcon name="info" size="sm" class="edit-secret__note-icon" />
				Enter a new value for this secret. The current value cannot be viewed for security reasons.
			</p>

			<UiField label="New Secret Value" :error="valueTouched && valueError ? valueError : undefined" required>
				<div class="edit-secret__control">
					<UiTextarea
						v-model="value"
						name="value"
						:rows="4"
						placeholder="Enter new secret value"
						spellcheck="false"
						autocomplete="off"
						class="edit-secret__value"
						:class="{ 'edit-secret__value--masked': !showValue }"
						data-testid="edit-secret-value-input"
						@blur="valueTouched = true"
					/>
					<UiIconButton
						:icon="showValue ? 'visibility_off' : 'visibility'"
						:label="showValue ? 'Hide value' : 'Show value'"
						size="sm"
						class="edit-secret__toggle edit-secret__toggle--top"
						data-testid="edit-secret-value-toggle"
						@click="showValue = !showValue"
					/>
				</div>
			</UiField>

			<div class="edit-secret__expiration">
				<UiField label="Expiration Date">
					<UiInput
						v-model="expiresAt"
						type="date"
						name="expiresAt"
						:min="minDate"
						:disabled="clearExpiration"
						data-testid="edit-secret-expires-input"
					/>
				</UiField>
				<UiCheckbox v-model="clearExpiration" data-testid="edit-secret-clear-expiration-checkbox">
					Remove expiration date
				</UiCheckbox>
			</div>

			<UiField
				v-if="data.secret.masterEncryption"
				label="Master Password"
				hint="Required to encrypt the new value"
				:error="masterPasswordError || undefined"
			>
				<div class="edit-secret__control">
					<UiInput
						v-model="masterPassword"
						:type="showMasterPassword ? 'text' : 'password'"
						name="masterPassword"
						placeholder="Enter master password to save changes"
						autocomplete="off"
						class="edit-secret__password"
						data-testid="edit-secret-master-password-input"
					/>
					<UiIconButton
						:icon="showMasterPassword ? 'visibility_off' : 'visibility'"
						:label="showMasterPassword ? 'Hide password' : 'Show password'"
						size="sm"
						class="edit-secret__toggle"
						data-testid="edit-secret-master-password-toggle"
						@click="showMasterPassword = !showMasterPassword"
					/>
				</div>
			</UiField>
		</div>
	</AppDialogForm>
</template>

<style scoped>
.edit-secret {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
}

.edit-secret__note {
	display: flex;
	align-items: flex-start;
	gap: var(--space-2);
	margin: 0;
	padding: var(--space-3) var(--space-4);
	border-radius: var(--radius-card);
	background: var(--color-paper-2);
	font-size: var(--text-sm);
	color: var(--color-ink-soft);
}

.edit-secret__note-icon {
	flex: none;
	color: var(--color-accent);
}

.edit-secret__expiration {
	display: flex;
	flex-direction: column;
	gap: var(--space-2);
}

.edit-secret__control {
	position: relative;
}

.edit-secret__control > .edit-secret__value,
.edit-secret__control > .edit-secret__password {
	padding-inline-end: var(--space-10);
}

.edit-secret__value--masked {
	-webkit-text-security: disc;
}

.edit-secret__toggle {
	position: absolute;
	inset-block-start: 50%;
	inset-inline-end: var(--space-1);
	transform: translateY(-50%);
}

.edit-secret__toggle--top {
	inset-block-start: var(--space-1);
	transform: none;
}
</style>
