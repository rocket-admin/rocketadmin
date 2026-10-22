<script setup lang="ts">
// Port of frontend/src/app/components/email-verification: the emailed verification link
// (/external/user/email/verify/:verificationToken). Verifies on load, then goes to /user-settings
// when the visitor was already signed in, /login otherwise. A failure stays on "Verifying..." with
// the error alert, as in Angular.
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/AppAlert.vue';
import { TOKEN_EXPIRATION_KEY, useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const isVerified = ref(false);

onMounted(async () => {
	const verificationToken = String(route.params.verificationToken ?? '');
	// Read before verifying: a successful verification may start a session and store one.
	const expirationTime = localStorage.getItem(TOKEN_EXPIRATION_KEY);
	try {
		await auth.verifyEmail(verificationToken);
	} catch {
		return;
	}
	router.push(expirationTime ? '/user-settings' : '/login');
	isVerified.value = true;
});
</script>

<template>
	<div class="email-verification">
		<AppAlert class="email-verification__alert" />

		<div v-if="!isVerified" class="email-verification__loader">
			<h1 class="email-verification__title">Verifying...</h1>
		</div>
	</div>
</template>

<style scoped>
.email-verification {
	display: flex;
	flex-direction: column;
	min-height: calc(100vh - var(--header-height) - var(--footer-height));
	padding: var(--space-4);
}

.email-verification__loader {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
}

.email-verification__title {
	margin: 0;
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}
</style>
