<script setup lang="ts">
// Port of frontend/src/app/components/user-settings (/user-settings): the account page — name,
// email and password changes, two-factor authentication and account deletion.
import { computed, onMounted, ref, watch } from 'vue';
import { trackAuthEvent } from '@/components/auth/analytics';
import ProfileLayout from '@/components/profile/ProfileLayout.vue';
import AppAlert from '@/components/shared/AppAlert.vue';
import { UiButton, UiField, UiIcon, UiInput, UiSwitch, vTooltip } from '@/components/ui';
import AccountDeleteDialog from '@/components/user-settings/AccountDeleteDialog.vue';
import EnableTwoFaDialog, { type EnableTwoFaResult } from '@/components/user-settings/EnableTwoFaDialog.vue';
import { useDialog } from '@/composables/useDialog';
import { type Alert, AlertActionType, AlertType } from '@/models/alert';
import { useAuthStore } from '@/stores/auth';
import { useUserStore } from '@/stores/user';

const AUTH_PROVIDER_ICONS: Record<string, string> = {
	GOOGLE: '/assets/icons/google.svg',
	GITHUB: '/assets/icons/github.svg',
};

const userStore = useUserStore();
const authStore = useAuthStore();
const dialog = useDialog();

const currentUser = computed(() => userStore.currentUser);
const userName = ref('');
const nameDirty = ref(false);
const submittingChangedName = ref(false);
const is2FAEnabledToggle = ref(false);
const is2FAswitchingOffSettingsShown = ref(false);
const authCode = ref('');

const emailVerificationWarning: Alert = {
	id: 10000001,
	type: AlertType.Warning,
	message: 'Your email address is not confirmed. Please check your email or resend confirmation.',
	actions: [
		{
			type: AlertActionType.Button,
			caption: 'Resend confirmation',
			action: () => requestEmailVerification(),
		},
	],
};

const registeredWithEmail = computed(() => currentUser.value?.externalRegistrationProvider === null);
const providerIcon = computed(() => {
	const provider = currentUser.value?.externalRegistrationProvider;
	return provider ? AUTH_PROVIDER_ICONS[provider] : undefined;
});

watch(
	currentUser,
	(user) => {
		if (!user) return;
		userName.value = user.name ?? '';
		is2FAEnabledToggle.value = user.is_2fa_enabled;
	},
	{ immediate: true },
);

onMounted(() => {
	document.title = 'Account settings | Rocketadmin';
	// The shell loads the user after sign-in; a direct visit may get here first.
	if (!userStore.currentUser) userStore.fetchUser().catch(() => {});
});

function requestEmailVerification() {
	authStore.requestEmailVerifications().catch(() => {});
}

async function changeEmail() {
	try {
		await userStore.requestEmailChange();
		trackAuthEvent('User settings: email change request is sent successfully');
	} catch {
		// The store has shown the error.
	}
}

async function changeUserName() {
	submittingChangedName.value = true;
	try {
		await userStore.changeUserName(userName.value);
		trackAuthEvent('User settings: user name is updated successfully');
	} catch {
		// The store has shown the error.
	} finally {
		submittingChangedName.value = false;
	}
}

async function switch2FA(checked: boolean) {
	trackAuthEvent('User settings: 2fa is toggled', { enable: checked });
	const user = currentUser.value;
	if (!user) return;
	if (checked && !user.is_2fa_enabled) {
		try {
			const { qrCode } = await userStore.switchOn2FA();
			const result = await dialog.open<EnableTwoFaResult>(EnableTwoFaDialog, { data: qrCode }).afterClosed();
			if (result !== 'enable') is2FAEnabledToggle.value = false;
		} catch {
			is2FAEnabledToggle.value = false;
		}
	} else if (checked && user.is_2fa_enabled) {
		is2FAswitchingOffSettingsShown.value = false;
	} else {
		is2FAswitchingOffSettingsShown.value = true;
	}
}

async function switchOff2FA() {
	try {
		const response = (await userStore.switchOff2FA(authCode.value)) as { disabled?: boolean } | null;
		if (response?.disabled) {
			is2FAswitchingOffSettingsShown.value = false;
			authCode.value = '';
			trackAuthEvent('User settings: 2fa disabled successfully');
		}
	} catch {
		// The store has shown the error.
	}
}

function confirmDeleteAccount() {
	if (currentUser.value) dialog.open(AccountDeleteDialog, { data: currentUser.value });
}
</script>

<template>
	<ProfileLayout active-tab="account">
		<template #alerts>
			<AppAlert
				v-if="currentUser?.id && !currentUser.isActive"
				:alert="emailVerificationWarning"
				class="profile-layout__alert"
			/>
		</template>

		<div class="user-settings">
			<h1 class="user-settings__title">Account settings</h1>

			<div v-if="currentUser" class="user-settings__body">
				<form class="user-settings__name-form" novalidate @submit.prevent="changeUserName">
					<UiField label="Name" class="user-settings__name-field">
						<UiInput
							v-model="userName"
							name="user-name"
							data-testid="user-name-input"
							@input="nameDirty = true"
							@change="trackAuthEvent('User settings: user name is edited')"
						/>
					</UiField>
					<UiButton
						type="submit"
						variant="ghost"
						data-testid="save-user-name-button"
						class="user-settings__save-button"
						:disabled="!nameDirty || submittingChangedName"
					>
						Save
					</UiButton>
				</form>

				<div class="user-settings__section-heading">
					<UiIcon v-if="registeredWithEmail" v-tooltip="'You registred with your email'" name="mail" />
					<img
						v-else-if="providerIcon"
						v-tooltip="`You registred with ${currentUser.externalRegistrationProvider}`"
						:src="providerIcon"
						alt=""
						class="user-settings__provider-icon"
					>
					<strong>Email:</strong>
					<span class="user-settings__value">{{ currentUser.email }}</span>
				</div>
				<UiButton
					v-if="registeredWithEmail"
					variant="secondary"
					data-testid="user-settings__button"
					class="user-settings__button"
					:disabled="!currentUser.isActive"
					@click="changeEmail"
				>
					Change email
				</UiButton>

				<template v-if="registeredWithEmail">
					<div class="user-settings__section-heading">
						<strong>Password:</strong>
					</div>
					<UiButton
						variant="secondary"
						to="/change-password"
						data-testid="change-user-password-link"
						class="user-settings__button"
						:disabled="!currentUser.isActive"
						@click="trackAuthEvent('User settings: change password is clicked')"
					>
						Change password
					</UiButton>
				</template>

				<div v-if="currentUser.externalRegistrationProvider !== 'GITHUB'">
					<div class="user-settings__two-fa">
						<UiSwitch
							v-model="is2FAEnabledToggle"
							:disabled="!currentUser.isActive"
							data-testid="two-fa-toggle"
							@update:model-value="switch2FA"
						>
							Two-factor authentication
						</UiSwitch>
						<UiIcon
							v-if="!currentUser.isActive"
							v-tooltip="'Available only after email confirmation.'"
							name="info"
							size="sm"
							label="Available only after email confirmation."
						/>
					</div>

					<form
						v-if="is2FAswitchingOffSettingsShown"
						class="user-settings__two-fa-off"
						novalidate
						@submit.prevent="switchOff2FA"
					>
						<UiField label="Enter the code from your authenticator" class="user-settings__name-field">
							<UiInput v-model="authCode" name="code" autocomplete="one-time-code" />
						</UiField>
						<UiButton type="submit" variant="ghost">Disable</UiButton>
					</form>
				</div>
			</div>

			<UiButton variant="ghost" class="user-settings__delete" @click="confirmDeleteAccount">Delete account</UiButton>
		</div>
	</ProfileLayout>
</template>

<style scoped>
.user-settings {
	display: flex;
	flex-direction: column;
	width: 96%;
	min-width: 300px;
	max-width: 520px;
	margin: var(--space-10) auto;
	padding: 0 var(--space-6);
}

.user-settings__title {
	margin: 0;
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.user-settings__body {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	margin-top: var(--space-8);
}

.user-settings__name-form,
.user-settings__two-fa-off {
	display: flex;
	align-items: flex-end;
	gap: var(--space-2);
	width: 100%;
}

.user-settings__two-fa-off {
	margin-top: var(--space-6);
}

.user-settings__name-field {
	flex: 1;
}

.user-settings__section-heading {
	display: flex;
	align-items: center;
	gap: var(--space-3);
	margin-top: var(--space-10);
	margin-bottom: var(--space-2);
}

.user-settings__provider-icon {
	width: var(--space-6);
	height: var(--space-6);
}

.user-settings__value {
	overflow-wrap: anywhere;
}

.user-settings__two-fa {
	display: flex;
	align-items: center;
	gap: var(--space-3);
	margin-top: var(--space-10);
}

.user-settings__delete {
	align-self: center;
	margin-top: var(--space-16);
}

@media (width <= 600px) {
	.user-settings {
		margin: var(--space-6) auto;
		padding: 0 var(--space-4);
	}
}
</style>
