<script setup lang="ts">
// Port of frontend/src/app/components/secrets/create-secret-dialog: a new secret with an optional
// expiration date and optional master password encryption. Closes with `true` once created (the
// store reloads the page of secrets behind it).
import { computed, ref, watch } from 'vue';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { UiCheckbox, UiField, UiIconButton, UiInput, UiTextarea } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import { useSecretsStore } from '@/stores/secrets';
import { dateInputToIso, toDateInputValue, trackSecretsEvent } from './secretUtils';

const SLUG_PATTERN = /^[a-zA-Z0-9_-]+$/;

const dialogRef = useDialogRef<boolean>();
const secrets = useSecretsStore();

const slug = ref('');
const value = ref('');
const expiresAt = ref('');
const masterEncryption = ref(false);
const masterPassword = ref('');

const submitting = ref(false);
const showValue = ref(false);
const showMasterPassword = ref(false);
const minDate = toDateInputValue(new Date());

// mat-error shows once a control has been left.
const touched = ref({ slug: false, value: false, masterPassword: false });

watch(masterEncryption, (enabled) => {
	if (!enabled) {
		masterPassword.value = '';
		touched.value.masterPassword = false;
	}
});

const slugError = computed(() => {
	if (!slug.value) return 'Unique identifier is required';
	if (slug.value.length > 255) return 'Unique identifier must be 255 characters or less';
	if (!SLUG_PATTERN.test(slug.value)) return 'Only letters, numbers, hyphens, and underscores allowed (no spaces)';
	return '';
});

const valueError = computed(() => {
	if (!value.value) return 'Value is required';
	if (value.value.length > 10000) return 'Value must be 10000 characters or less';
	return '';
});

const masterPasswordError = computed(() => {
	if (!masterEncryption.value) return '';
	if (!masterPassword.value) return 'Master password is required for encryption';
	if (masterPassword.value.length < 8) return 'Master password must be at least 8 characters';
	return '';
});

const formInvalid = computed(() => Boolean(slugError.value || valueError.value || masterPasswordError.value));

function shownError(error: string, isTouched: boolean): string | undefined {
	return error && isTouched ? error : undefined;
}

async function onSubmit() {
	if (formInvalid.value) return;
	submitting.value = true;
	try {
		await secrets.createSecret({
			slug: slug.value,
			value: value.value,
			expiresAt: dateInputToIso(expiresAt.value),
			masterEncryption: masterEncryption.value || undefined,
			masterPassword: masterEncryption.value ? masterPassword.value : undefined,
		});
		trackSecretsEvent('Secrets: secret created successfully');
		dialogRef.close(true);
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AppDialogForm
		title="Create Secret"
		:submit-label="submitting ? 'Creating...' : 'Create Secret'"
		:busy="submitting"
		:disabled="formInvalid"
		data-testid="create-secret-dialog"
		@submit="onSubmit"
	>
		<div class="create-secret">
			<UiField
				label="Unique Identifier"
				hint="Use letters, numbers, hyphens, and underscores (no spaces)"
				:error="shownError(slugError, touched.slug)"
				required
			>
				<UiInput
					v-model="slug"
					name="slug"
					placeholder="e.g., api-key, database-password"
					autocomplete="off"
					data-testid="create-secret-slug-input"
					@blur="touched.slug = true"
				/>
			</UiField>

			<UiField label="Secret Value" :error="shownError(valueError, touched.value)" required>
				<div class="create-secret__control">
					<UiTextarea
						v-model="value"
						name="value"
						:rows="3"
						placeholder="Enter your secret value"
						spellcheck="false"
						autocomplete="off"
						class="create-secret__value"
						:class="{ 'create-secret__value--masked': !showValue }"
						data-testid="create-secret-value-input"
						@blur="touched.value = true"
					/>
					<UiIconButton
						:icon="showValue ? 'visibility_off' : 'visibility'"
						:label="showValue ? 'Hide value' : 'Show value'"
						size="sm"
						class="create-secret__toggle create-secret__toggle--top"
						data-testid="create-secret-value-toggle"
						@click="showValue = !showValue"
					/>
				</div>
			</UiField>

			<UiField label="Expiration Date (Optional)" hint="Leave empty for no expiration">
				<UiInput
					v-model="expiresAt"
					type="date"
					name="expiresAt"
					:min="minDate"
					data-testid="create-secret-expires-input"
				/>
			</UiField>

			<div class="create-secret__encryption">
				<UiCheckbox v-model="masterEncryption" data-testid="create-secret-master-encryption-checkbox">
					Enable master password encryption
				</UiCheckbox>
				<p class="create-secret__encryption-hint">
					Add an extra layer of security with a master password. You'll need this password to view or edit the
					secret.
				</p>

				<UiField
					v-if="masterEncryption"
					label="Master Password"
					hint="Remember this password - it cannot be recovered!"
					:error="shownError(masterPasswordError, touched.masterPassword)"
					required
				>
					<div class="create-secret__control">
						<UiInput
							v-model="masterPassword"
							:type="showMasterPassword ? 'text' : 'password'"
							name="masterPassword"
							placeholder="Minimum 8 characters"
							autocomplete="new-password"
							class="create-secret__password"
							data-testid="create-secret-master-password-input"
							@blur="touched.masterPassword = true"
						/>
						<UiIconButton
							:icon="showMasterPassword ? 'visibility_off' : 'visibility'"
							:label="showMasterPassword ? 'Hide password' : 'Show password'"
							size="sm"
							class="create-secret__toggle"
							data-testid="create-secret-master-password-toggle"
							@click="showMasterPassword = !showMasterPassword"
						/>
					</div>
				</UiField>
			</div>
		</div>
	</AppDialogForm>
</template>

<style scoped>
.create-secret {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
}

.create-secret__control {
	position: relative;
}

.create-secret__control > .create-secret__value,
.create-secret__control > .create-secret__password {
	padding-inline-end: var(--space-10);
}

.create-secret__value--masked {
	-webkit-text-security: disc;
}

.create-secret__toggle {
	position: absolute;
	inset-block-start: 50%;
	inset-inline-end: var(--space-1);
	transform: translateY(-50%);
}

.create-secret__toggle--top {
	inset-block-start: var(--space-1);
	transform: none;
}

.create-secret__encryption {
	display: flex;
	flex-direction: column;
	gap: var(--space-2);
	padding: var(--space-4);
	border-radius: var(--radius-card);
	background: var(--color-paper-2);
}

.create-secret__encryption-hint {
	margin: 0 0 var(--space-2);
	font-size: var(--text-xs);
	color: var(--color-muted);
}
</style>
