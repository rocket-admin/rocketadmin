<script setup lang="ts">
// Port of frontend/src/app/components/secrets/master-password-dialog: asks for the master password
// of a secret with master encryption and closes with it (dismissed, it closes with undefined).
// Not opened anywhere in the Angular app yet; ported so the secrets area is complete.
import { ref } from 'vue';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { UiField, UiIconButton, UiInput } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';

const dialogRef = useDialogRef<string>();

const masterPassword = ref('');
const showPassword = ref(false);
const error = ref('');

function onSubmit() {
	if (!masterPassword.value) {
		error.value = 'Please enter the master password';
		return;
	}
	dialogRef.close(masterPassword.value);
}
</script>

<template>
	<AppDialogForm title="Master Password Required" submit-label="Unlock" size="sm" @submit="onSubmit">
		<div class="secret-master-password">
			<p class="secret-master-password__description">
				This secret is protected with master password encryption. Enter the master password to continue.
			</p>

			<UiField label="Master Password" :error="error || undefined">
				<div class="secret-master-password__control">
					<UiInput
						v-model="masterPassword"
						:type="showPassword ? 'text' : 'password'"
						name="masterPassword"
						placeholder="Enter master password"
						autocomplete="off"
						class="secret-master-password__input"
						data-testid="master-password-input"
					/>
					<UiIconButton
						:icon="showPassword ? 'visibility_off' : 'visibility'"
						:label="showPassword ? 'Hide password' : 'Show password'"
						size="sm"
						class="secret-master-password__toggle"
						@click="showPassword = !showPassword"
					/>
				</div>
			</UiField>
		</div>
	</AppDialogForm>
</template>

<style scoped>
.secret-master-password {
	display: flex;
	flex-direction: column;
	gap: var(--space-6);
}

.secret-master-password__description {
	margin: 0;
	color: var(--color-muted);
}

.secret-master-password__control {
	position: relative;
}

.secret-master-password__control > .secret-master-password__input {
	padding-inline-end: var(--space-10);
}

.secret-master-password__toggle {
	position: absolute;
	inset-block-start: 50%;
	inset-inline-end: var(--space-1);
	transform: translateY(-50%);
}
</style>
