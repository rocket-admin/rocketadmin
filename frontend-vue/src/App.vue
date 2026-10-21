<script setup lang="ts">
// Port of AppComponent: the shell around every page.
import { ref } from 'vue';
import AppHeader from '@/components/app/AppHeader.vue';
import AppNavDrawer from '@/components/app/AppNavDrawer.vue';
import AppSnackbars from '@/components/app/AppSnackbars.vue';
import FeatureNotification from '@/components/app/FeatureNotification.vue';
import ViewAsBanner from '@/components/app/ViewAsBanner.vue';
import DialogHost from '@/components/dialog/DialogHost.vue';
import { useAppSession } from '@/composables/useAppSession';
import { useMasterPasswordStore } from '@/stores/master-password';
import { version } from '@/version';

const session = useAppSession();
const masterPassword = useMasterPasswordStore();
const navOpen = ref(false);

function logOut() {
	session.logOut().catch(() => {});
}
</script>

<template>
	<div class="app-shell">
		<ViewAsBanner />
		<AppHeader :user-logged-in="session.userLoggedIn.value" @open-menu="navOpen = true" @log-out="logOut" />
		<AppNavDrawer v-model:open="navOpen" @log-out="logOut" @support-chat="session.openSupportChat" />
		<main>
			<!-- Keyed so entering a master password re-creates the page with the key in place. -->
			<RouterView :key="masterPassword.pageReloadKey" />
		</main>
		<footer class="app-footer">&copy; 2026 Rocketadmin • v{{ version }}</footer>
		<FeatureNotification
			v-if="session.isFeatureNotificationShown.value"
			@dismiss="session.dismissFeatureNotification"
		/>
		<DialogHost />
		<AppSnackbars />
	</div>
</template>
