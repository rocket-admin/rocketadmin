<script setup lang="ts">
// Port of frontend/src/app/components/setup: a fresh self-hosted install creates its first admin
// (POST /selfhosted/initial-user) and goes to /login. Reached only through the setup guard.
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import AuthHeader from '@/components/auth/AuthHeader.vue';
import UserPassword from '@/components/auth/UserPassword.vue';
import { isValidEmail, isValidNewPassword } from '@/components/auth/validity';
import AppAlert from '@/components/shared/AppAlert.vue';
import { UiButton, UiField, UiInput } from '@/components/ui';
import { useSelfhostedStore } from '@/stores/selfhosted';
import { EMAIL_ERROR_MESSAGE, emailErrors } from '@/validators/email.validator';

const selfhosted = useSelfhostedStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const submitting = ref(false);
const dirty = ref(false);
const emailTouched = ref(false);

const emailError = computed(() => (emailTouched.value && emailErrors(email.value) ? EMAIL_ERROR_MESSAGE : undefined));
const formInvalid = computed(() => !isValidEmail(email.value) || !isValidNewPassword(password.value));

function onEmailChange(value: string) {
	email.value = value;
	dirty.value = true;
}

function onPasswordChange(value: string) {
	password.value = value;
	dirty.value = true;
}

async function createAdminAccount(): Promise<void> {
	if (!email.value || !password.value) return;

	submitting.value = true;
	try {
		await selfhosted.createInitialUser({ email: email.value, password: password.value });
		router.push('/login');
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<div class="setup">
		<AppAlert class="setup__alert" />

		<div class="setup__page">
			<form class="setup__form" novalidate @submit.prevent="createAdminAccount">
				<AuthHeader greeting="Welcome to">Create your admin account to get started.</AuthHeader>

				<UiField label="Email" :error="emailError" required class="setup__field">
					<UiInput
						type="email"
						name="email"
						placeholder="Email"
						autocomplete="email"
						data-testid="setup-email-input"
						:model-value="email"
						@update:model-value="onEmailChange"
						@blur="emailTouched = true"
					/>
				</UiField>

				<UserPassword
					:model-value="password"
					label="Password"
					class="setup__field"
					@update:model-value="onPasswordChange"
				/>

				<UiButton
					type="submit"
					block
					class="setup__submit"
					data-testid="setup-submit-button"
					:disabled="submitting || formInvalid || !dirty"
				>
					{{ submitting ? 'Creating...' : 'Create Admin Account' }}
				</UiButton>
			</form>
		</div>
	</div>
</template>

<style scoped>
.setup {
	min-height: calc(100vh - var(--header-height) - var(--footer-height));
	padding: var(--space-4);
}

.setup__alert {
	margin-bottom: var(--space-4);
}

.setup__page {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: inherit;
}

.setup__form {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--space-4);
	width: clamp(22.5rem, 30%, 37.5rem);
}

.setup__field {
	width: 100%;
}

.setup__submit {
	margin-top: var(--space-10);
}

@media (width <= 600px) {
	.setup {
		padding: 0;
	}

	.setup__page {
		justify-content: flex-start;
	}

	.setup__form {
		gap: var(--space-2);
		width: 100%;
		padding: var(--space-10) 9vw;
	}

	.setup__submit {
		margin-top: 0;
	}
}
</style>
