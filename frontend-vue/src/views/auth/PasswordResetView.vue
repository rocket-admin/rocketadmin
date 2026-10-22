<script setup lang="ts">
// Port of frontend/src/app/components/password-reset: the emailed reset link
// (/external/user/password/reset/verify/:verificationToken). Sets the new password and goes to /login.
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import UserPassword from '@/components/auth/UserPassword.vue';
import { isValidNewPassword } from '@/components/auth/validity';
import AppAlert from '@/components/shared/AppAlert.vue';
import { UiButton, UiPageShell } from '@/components/ui';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const token = computed(() => String(route.params.verificationToken ?? ''));
const newPassword = ref('');
const submitting = ref(false);

async function updatePassword() {
	submitting.value = true;
	try {
		await userStore.resetPassword(token.value, newPassword.value);
		router.push('/login');
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<UiPageShell align="center" width="auth" class="password-reset">
		<AppAlert class="password-reset__alert" />

		<form class="password-reset__form" novalidate @submit.prevent="updatePassword">
			<h1 class="password-reset__title">Change your password</h1>
			<UserPassword v-model="newPassword" label="Enter new password" />

			<UiButton
				type="submit"
				class="password-reset__button"
				data-testid="password-reset-button"
				:disabled="submitting || !isValidNewPassword(newPassword)"
			>
				Change
			</UiButton>
		</form>
	</UiPageShell>
</template>

<style scoped>
.password-reset {
	min-height: calc(100vh - var(--header-height) - var(--footer-height));
}

.password-reset__alert {
	margin-bottom: var(--space-6);
}

.password-reset__form {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
}

.password-reset__title {
	margin: 0;
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.password-reset__button {
	align-self: flex-end;
	margin-top: var(--space-2);
}
</style>
