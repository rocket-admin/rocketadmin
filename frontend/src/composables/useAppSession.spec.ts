import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, reactive } from 'vue';
import { CURRENT_FEATURE_NOTIFICATION_ID, useAppSession } from './useAppSession';

const currentUser = { id: 'u1', email: 'ada@example.com', isActive: true, intercom_hash: 'hash' };
let deletedListener: (() => void) | null = null;

const auth = reactive({
	isAuthenticated: false,
	logOut: vi.fn(async () => {}),
});
const user = reactive({
	currentUser: null as typeof currentUser | null,
	fetchUser: vi.fn(async () => {
		user.currentUser = currentUser;
		return currentUser;
	}),
	clearUser: vi.fn(() => {
		user.currentUser = null;
	}),
	onAccountDeleted: vi.fn((listener: () => void) => {
		deletedListener = listener;
		return () => {
			deletedListener = null;
		};
	}),
});
const connections = reactive({ connectionsVersion: 0, fetchConnections: vi.fn(async () => []) });
const uiSettings = reactive({
	getUiSettings: vi.fn(async () => ({ globalSettings: { lastFeatureNotificationId: 'older' } })),
	updateGlobalSetting: vi.fn(),
});

vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }));
vi.mock('@/stores/user', () => ({ useUserStore: () => user }));
vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => connections }));
vi.mock('@/stores/ui-settings', () => ({ useUiSettingsStore: () => uiSettings }));

function startSession() {
	const scope = effectScope();
	const session = scope.run(() => useAppSession());
	if (!session) throw new Error('no session');
	return { session, scope };
}

describe('useAppSession', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		auth.isAuthenticated = false;
		user.currentUser = null;
		connections.connectionsVersion = 0;
		window.Intercom = vi.fn();
	});

	afterEach(() => {
		delete window.Intercom;
	});

	it('stays signed out without a session', async () => {
		const { session, scope } = startSession();
		await flushPromises();

		expect(session.userLoggedIn.value).toBe(false);
		expect(user.fetchUser).not.toHaveBeenCalled();
		scope.stop();
	});

	it('loads the user, boots Intercom and fetches connections once signed in', async () => {
		auth.isAuthenticated = true;
		const { session, scope } = startSession();
		expect(session.userLoggedIn.value).toBeNull();
		await flushPromises();

		expect(session.userLoggedIn.value).toBe(true);
		expect(window.Intercom).toHaveBeenCalledWith(
			'boot',
			expect.objectContaining({ user_id: 'u1', email: 'ada@example.com', user_hash: 'hash' }),
		);
		expect(connections.fetchConnections).toHaveBeenCalledTimes(1);

		connections.connectionsVersion++;
		await flushPromises();
		expect(connections.fetchConnections).toHaveBeenCalledTimes(2);
		scope.stop();
	});

	it('shows the feature notification until it is dismissed', async () => {
		auth.isAuthenticated = true;
		const { session, scope } = startSession();
		await flushPromises();

		expect(session.isFeatureNotificationShown.value).toBe(true);
		session.dismissFeatureNotification();
		expect(uiSettings.updateGlobalSetting).toHaveBeenCalledWith(
			'lastFeatureNotificationId',
			CURRENT_FEATURE_NOTIFICATION_ID,
		);
		expect(session.isFeatureNotificationShown.value).toBe(false);
		scope.stop();
	});

	it('hides the feature notification for users who already saw it', async () => {
		uiSettings.getUiSettings.mockResolvedValueOnce({
			globalSettings: { lastFeatureNotificationId: CURRENT_FEATURE_NOTIFICATION_ID },
		});
		auth.isAuthenticated = true;
		const { session, scope } = startSession();
		await flushPromises();

		expect(session.isFeatureNotificationShown.value).toBe(false);
		scope.stop();
	});

	it('clears the user when the session ends', async () => {
		auth.isAuthenticated = true;
		const { session, scope } = startSession();
		await flushPromises();

		auth.isAuthenticated = false;
		await flushPromises();

		expect(user.clearUser).toHaveBeenCalled();
		expect(session.userLoggedIn.value).toBe(false);
		scope.stop();
	});

	it('logs out with the user email, and as expired after account deletion', async () => {
		auth.isAuthenticated = true;
		const { session, scope } = startSession();
		await flushPromises();

		await session.logOut();
		expect(auth.logOut).toHaveBeenCalledWith(false, 'ada@example.com');

		deletedListener?.();
		expect(auth.logOut).toHaveBeenLastCalledWith(true);

		scope.stop();
		expect(deletedListener).toBeNull();
	});
});
