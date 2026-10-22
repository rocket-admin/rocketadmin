<script setup lang="ts">
// Port of frontend/src/app/components/company-member-invitation: the emailed invitation link
// (/company/:companyId/verify/:verificationToken). Checks the link while showing the skeleton; a
// dead link gets the "invalid" banner, a live one asks for a password and a display name, and
// joining starts a session and goes to /connections-list.
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { trackAuthEvent } from '@/components/auth/analytics';
import UserPassword from '@/components/auth/UserPassword.vue';
import { isValidNewPassword } from '@/components/auth/validity';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppBanner from '@/components/shared/AppBanner.vue';
import PlaceholderCompanyInvitation from '@/components/skeletons/PlaceholderCompanyInvitation.vue';
import { UiButton, UiField, UiInput, UiPageShell } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { useCompanyStore } from '@/stores/company';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const company = useCompanyStore();

const token = computed(() => String(route.params.verificationToken ?? ''));
const companyName = ref<string | null>(null);
const password = ref('');
const userName = ref('');
const submitting = ref(false);
const checkingLink = ref(true);
const isLinkAvailable = ref(false);

const formInvalid = computed(() => !isValidNewPassword(password.value) || !userName.value);

onMounted(() => {
	const companyId = String(route.params.companyId ?? '');
	company
		.fetchCompanyName(companyId)
		.then((response) => {
			companyName.value = response.name;
		})
		.catch(() => {});
	auth
		.checkInvitationAvailability(token.value)
		.then((response) => {
			isLinkAvailable.value = response.success;
		})
		.catch(() => {
			isLinkAvailable.value = false;
		})
		.finally(() => {
			checkingLink.value = false;
		});
});

async function acceptInvitation() {
	submitting.value = true;
	try {
		await auth.acceptCompanyInvitation(token.value, password.value, userName.value);
		trackAuthEvent('Company invitation: invitation is accepted successfully');
		router.push('/connections-list');
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<UiPageShell v-if="checkingLink" align="center" width="auth">
		<PlaceholderCompanyInvitation />
	</UiPageShell>

	<AppBanner v-else-if="!isLinkAvailable">
		<h1 class="invitation__banner-title">Invitation link is invalid</h1>
		<p>The link you are trying to use is invalid. Please contact the person who sent you the link.</p>
		<template #actions>
			<UiButton to="/login">Go to login page</UiButton>
		</template>
	</AppBanner>

	<UiPageShell v-else align="center" width="auth" class="invitation">
		<AppAlert class="invitation__alert" />

		<form class="invitation__form" novalidate @submit.prevent="acceptInvitation">
			<h1 class="invitation__title">
				You were invited to
				<strong v-if="companyName !== null" data-testid="invitation-company-name">{{
					companyName || 'Unknown company'
				}}</strong>
				company
			</h1>
			<p class="invitation__text">Create password for your account in this company.</p>
			<UserPassword v-model="password" label="Password" />

			<hr class="invitation__divider">

			<p class="invitation__text">Add name visible to your coworkers.</p>
			<UiField label="Name" required>
				<UiInput v-model="userName" name="user-name" autocomplete="name" data-testid="invitation-name-input" />
			</UiField>

			<div class="invitation__actions">
				<UiButton type="submit" data-testid="invitation-join-button" :disabled="submitting || formInvalid">
					Join
				</UiButton>
			</div>
		</form>
	</UiPageShell>
</template>

<style scoped>
.invitation {
	min-height: calc(100vh - var(--header-height) - var(--footer-height));
}

.invitation__alert {
	margin-bottom: var(--space-6);
}

.invitation__form {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
}

.invitation__title {
	margin: 0 0 var(--space-4);
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-regular);
	line-height: var(--leading-snug);
	color: var(--color-ink);
}

.invitation__banner-title {
	font-size: var(--text-xl);
	color: var(--color-ink);
}

.invitation__text {
	margin: 0;
	color: var(--color-muted);
}

.invitation__divider {
	width: 100%;
	margin: var(--space-8) 0 var(--space-1);
	border: 0;
	border-top: 1px solid var(--color-line);
}

.invitation__actions {
	display: flex;
	justify-content: flex-end;
}
</style>
