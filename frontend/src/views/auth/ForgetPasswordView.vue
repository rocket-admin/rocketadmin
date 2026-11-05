<script setup lang="ts">
// Port of frontend/src/app/components/password-request. Like login, "Next" looks up the email's
// companies first (one is picked automatically, several show a picker), then "Reset my password"
// asks for the reset email (POST /user/password/reset/request; the store shows "Check your email.").
import { computed, ref } from 'vue';
import { isValidEmail } from '@/components/auth/validity';
import AppAlert from '@/components/shared/AppAlert.vue';
import { UiButton, UiField, UiInput, UiPageShell, UiSelect, UiSkeleton } from '@/components/ui';
import { type CompanyOption, useAuthStore } from '@/stores/auth';
import { useUserStore } from '@/stores/user';
import { EMAIL_ERROR_MESSAGE, emailErrors } from '@/validators/email.validator';

const auth = useAuthStore();
const userStore = useUserStore();

const userEmail = ref('');
const companyId = ref('');
const submitting = ref(false);
const isLoadingUserCompanies = ref(false);
const userCompanies = ref<CompanyOption[] | null>(null);
const dirty = ref(false);
const emailTouched = ref(false);

const hasCompanyChoice = computed(() => Boolean(userCompanies.value && userCompanies.value.length > 1));
const emailError = computed(() =>
	emailTouched.value && emailErrors(userEmail.value) ? EMAIL_ERROR_MESSAGE : undefined,
);
const formInvalid = computed(() => !isValidEmail(userEmail.value) || (hasCompanyChoice.value && !companyId.value));
const companyOptions = computed(() =>
	(userCompanies.value ?? []).map((option) => ({ value: option.id, label: option.name })),
);

function onSubmit() {
	if (companyId.value) requestPassword();
	else requestUserCompanies();
}

async function requestUserCompanies() {
	isLoadingUserCompanies.value = true;
	try {
		const companies = await auth.fetchUserCompanies(userEmail.value);
		userCompanies.value = companies;
		if (companies.length === 1 && companies[0]) companyId.value = companies[0].id;
	} catch {
		// The store has shown the error.
	} finally {
		isLoadingUserCompanies.value = false;
	}
}

async function requestPassword() {
	submitting.value = true;
	try {
		await userStore.requestPasswordReset(userEmail.value, companyId.value);
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}

function onEmailInput(value: string) {
	userEmail.value = value;
	dirty.value = true;
}

function onCompanyChange(value: unknown) {
	companyId.value = typeof value === 'string' ? value : '';
	dirty.value = true;
}
</script>

<template>
	<UiPageShell align="center" width="auth" class="forget-password">
		<AppAlert class="forget-password__alert" />

		<form class="forget-password__form" novalidate @submit.prevent="onSubmit">
			<h1 class="forget-password__title">Forgot your password?</h1>
			<p class="forget-password__text">Enter your Email below and we will send a message to reset your password.</p>

			<UiField label="Email" :error="emailError" required>
				<UiInput
					type="email"
					name="email"
					autocomplete="email"
					autofocus
					data-testid="forget-password-email-input"
					:model-value="userEmail"
					@update:model-value="onEmailInput"
					@blur="emailTouched = true"
				/>
			</UiField>

			<UiSkeleton v-if="isLoadingUserCompanies" shape="control" height="2.75rem" />

			<UiField v-if="hasCompanyChoice" label="Company" required>
				<UiSelect
					:model-value="companyId || null"
					:options="companyOptions"
					placeholder="Company"
					data-testid="forget-password-company-select"
					@update:model-value="onCompanyChange"
				/>
			</UiField>

			<UiButton
				v-if="!companyId && !hasCompanyChoice"
				type="submit"
				variant="secondary"
				data-testid="forget-password-next-button"
				:disabled="isLoadingUserCompanies || userEmail === ''"
			>
				{{ submitting ? 'Submitting' : 'Next' }}
			</UiButton>
			<UiButton
				v-if="userCompanies && userCompanies.length"
				type="submit"
				class="forget-password__reset"
				data-testid="forget-password-submit-button"
				:disabled="submitting || formInvalid || !dirty"
			>
				{{ submitting ? 'Submitting' : 'Reset my password' }}
			</UiButton>
		</form>
	</UiPageShell>
</template>

<style scoped>
.forget-password {
	min-height: calc(100vh - var(--header-height) - var(--footer-height));
}

.forget-password__alert {
	margin-bottom: var(--space-6);
}

.forget-password__form {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
}

.forget-password__title {
	margin: 0;
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.forget-password__text {
	margin: 0;
	color: var(--color-muted);
	line-height: var(--leading-normal);
}
</style>
