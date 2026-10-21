// The session bootstrap that lived in AppComponent: once signed in, load the user, boot Intercom,
// keep the connections list fresh and decide whether to show the feature notification; log out on
// account deletion.
import { onScopeDispose, ref, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useConnectionsStore } from '@/stores/connections';
import { useUiSettingsStore } from '@/stores/ui-settings';
import { useUserStore } from '@/stores/user';

/** Bump when a new feature notification ships; users who dismissed the previous one see it once. */
export const CURRENT_FEATURE_NOTIFICATION_ID = 'edit-schema';

export function useAppSession() {
	const auth = useAuthStore();
	const user = useUserStore();
	const connections = useConnectionsStore();
	const uiSettings = useUiSettingsStore();

	/** null while unknown (signed in, user not loaded yet), like AppComponent.userLoggedIn. */
	const userLoggedIn = ref<boolean | null>(auth.isAuthenticated ? null : false);
	const isFeatureNotificationShown = ref(false);
	let stopConnectionsWatch: (() => void) | null = null;

	async function initializeUserSession(): Promise<void> {
		const currentUser = await user.fetchUser();
		userLoggedIn.value = true;
		window.Intercom?.('boot', {
			...window.intercomSettings,
			user_hash: currentUser.intercom_hash,
			user_id: currentUser.id,
			email: currentUser.email,
			hide_default_launcher: window.innerWidth <= 600,
		});

		// Replaces `_connections.cast.subscribe(() => fetchConnections())`.
		stopConnectionsWatch?.();
		stopConnectionsWatch = watch(
			() => connections.connectionsVersion,
			() => {
				connections.fetchConnections().catch(() => {});
			},
			{ immediate: true },
		);

		const settings = await uiSettings.getUiSettings();
		isFeatureNotificationShown.value =
			settings?.globalSettings?.lastFeatureNotificationId !== CURRENT_FEATURE_NOTIFICATION_ID;
	}

	watch(
		() => auth.isAuthenticated,
		(isAuthenticated) => {
			if (isAuthenticated) {
				initializeUserSession().catch(() => {});
			} else {
				stopConnectionsWatch?.();
				stopConnectionsWatch = null;
				isFeatureNotificationShown.value = false;
				user.clearUser();
				userLoggedIn.value = false;
			}
		},
		{ immediate: true },
	);

	const stopAccountDeleted = user.onAccountDeleted(() => {
		auth.logOut(true).catch(() => {});
	});
	onScopeDispose(() => {
		stopAccountDeleted();
		stopConnectionsWatch?.();
	});

	async function logOut(): Promise<void> {
		await auth.logOut(false, user.currentUser?.email);
	}

	function dismissFeatureNotification(): void {
		uiSettings.updateGlobalSetting('lastFeatureNotificationId', CURRENT_FEATURE_NOTIFICATION_ID);
		isFeatureNotificationShown.value = false;
	}

	function openSupportChat(): void {
		window.Intercom?.('show');
	}

	return { userLoggedIn, isFeatureNotificationShown, logOut, dismissFeatureNotification, openSupportChat };
}
