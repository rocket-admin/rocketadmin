<script setup lang="ts">
// Port of frontend/src/app/components/email-change: the emailed link
// (/external/user/email/change/verify/:changeToken). Sets the new email, reloads the user and goes
// to /user-settings.
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { isValidEmail } from '@/components/auth/validity';
import AppAlert from '@/components/shared/AppAlert.vue';
import { UiButton, UiField, UiInput, UiPageShell } from '@/components/ui';
import { useUserStore } from '@/stores/user';
import { EMAIL_ERROR_MESSAGE, emailErrors } from '@/validators/email.validator';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const token = computed(() => String(route.params.changeToken ?? ''));
const newEmail = ref('');
const submitting = ref(false);
const touched = ref(false);

const emailError = computed(() => {
	if (emailErrors(newEmail.value)) return EMAIL_ERROR_MESSAGE;
	if (touched.value && !newEmail.value) return 'Cannot be not empty.';
	return undefined;
});

async function updateEmail() {
	submitting.value = true;
	try {
		await userStore.changeEmail(token.value, newEmail.value);
		submitting.value = false;
		await userStore.fetchUser();
		router.push('/user-settings');
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<UiPageShell align="center" width="auth" class="email-change">
		<AppAlert class="email-change__alert" />

		<h1 class="email-change__title">Change your email</h1>
		<form class="email-change__form" novalidate @submit.prevent="updateEmail">
			<UiField label="Enter new email" :error="emailError" required>
				<UiInput
					v-model="newEmail"
					type="email"
					name="email"
					autocomplete="email"
					data-testid="email-change-input"
					@blur="touched = true"
				/>
			</UiField>

			<UiButton
				type="submit"
				class="email-change__button"
				data-testid="email-change-button"
				:disabled="submitting || !isValidEmail(newEmail)"
			>
				Change
			</UiButton>
		</form>
	</UiPageShell>
</template>

<style scoped>
.email-change {
	min-height: calc(100vh - var(--header-height) - var(--footer-height));
}

.email-change__alert {
	margin-bottom: var(--space-6);
}

.email-change__title {
	margin: 0 0 var(--space-4);
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.email-change__form {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
}

.email-change__button {
	align-self: flex-end;
}
</style>
