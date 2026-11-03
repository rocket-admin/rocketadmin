<script setup lang="ts">
// Port of frontend/src/app/components/password-change (/change-password, signed-in users): the old
// password plus a new one, then back to /user-settings.
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { trackAuthEvent } from '@/components/auth/analytics';
import UserPassword from '@/components/auth/UserPassword.vue';
import { isValidNewPassword } from '@/components/auth/validity';
import AppAlert from '@/components/shared/AppAlert.vue';
import { UiButton, UiField, UiInput, UiPageShell } from '@/components/ui';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();

const oldPassword = ref('');
const newPassword = ref('');
const submitting = ref(false);
const oldPasswordTouched = ref(false);

const oldPasswordError = computed(() =>
	oldPasswordTouched.value && !oldPassword.value ? 'Password can not be empty.' : undefined,
);
const formInvalid = computed(() => !oldPassword.value || !isValidNewPassword(newPassword.value));

onMounted(() => {
	// The shell loads the user after sign-in; a direct visit may get here first.
	if (!userStore.currentUser) userStore.fetchUser().catch(() => {});
});

async function updatePassword() {
	submitting.value = true;
	try {
		const email = userStore.currentUser?.email ?? (await userStore.fetchUser()).email;
		await userStore.changePassword(oldPassword.value, newPassword.value, email);
		trackAuthEvent('Manual password change: password updated successfully');
		router.push('/user-settings');
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<UiPageShell align="center" width="auth" class="password-change">
		<AppAlert class="password-change__alert" />

		<form class="password-change__form" novalidate @submit.prevent="updatePassword">
			<h1 class="password-change__title">Change password</h1>

			<UiField label="Enter old password" :error="oldPasswordError" required>
				<UiInput
					v-model="oldPassword"
					type="password"
					name="old-password"
					autocomplete="current-password"
					data-testid="password-change-old-input"
					@blur="oldPasswordTouched = true"
				/>
			</UiField>

			<UserPassword v-model="newPassword" label="Enter new password" />

			<div class="password-change__actions">
				<UiButton variant="secondary" to="/user-settings">Back</UiButton>
				<UiButton type="submit" data-testid="password-change-button" :disabled="submitting || formInvalid">
					Change
				</UiButton>
			</div>
		</form>
	</UiPageShell>
</template>

<style scoped>
.password-change {
	min-height: calc(100vh - var(--header-height) - var(--footer-height));
}

.password-change__alert {
	margin-bottom: var(--space-6);
}

.password-change__form {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
}

.password-change__title {
	margin: 0;
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.password-change__actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--space-5);
	margin-top: var(--space-8);
}
</style>
