// Port of frontend/src/app/services/users.service.ts: the user groups of the active connection,
// their members, the available Cedar actions, public (unauthenticated) access and the legacy
// per-table permissions endpoints.
//
// Angular's `httpResource`s become watchers that refetch when their key changes. The
// `groupsUpdated` signal (which UsersComponent turned into refreshes and then cleared) is gone:
// every mutation now does its own refresh.
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { api } from '@/api/client';
import type { PolicyAction, PolicyActionGroup } from '@/lib/cedar-policy-items';
import { groupNameForAction, PERMISSION_GROUP_ORDER } from '@/lib/permission-display';
import type {
	GroupUser,
	Permissions,
	PublicPermissions,
	PublicTablePermission,
	UserGroup,
	UserGroupInfo,
} from '@/models/user';
import { useAuthStore } from '@/stores/auth';

export interface ConnectionUser {
	id: string;
	isActive: boolean;
	email: string;
	createdAt: string;
	name?: string;
}

const EMPTY_PUBLIC_PERMISSIONS: PublicPermissions = { enabled: false, tables: [] };

export const useUsersStore = defineStore('users', () => {
	const auth = useAuthStore();

	const activeConnectionId = ref<string | null>(null);

	// --- Groups of the active connection (was `_groupsResource`) ---
	const groupsData = ref<UserGroupInfo[] | undefined>(undefined);
	const groupsLoading = ref(false);
	let groupsRequest = 0;

	/** Admin first, the rest in server order. */
	const groups = computed<UserGroupInfo[]>(() =>
		[...(groupsData.value ?? [])].sort((a, b) => {
			if (a.group.title === 'Admin') return -1;
			if (b.group.title === 'Admin') return 1;
			return 0;
		}),
	);

	async function loadGroups(connectionId: string | null): Promise<void> {
		const request = ++groupsRequest;
		if (!connectionId) {
			groupsData.value = undefined;
			groupsLoading.value = false;
			return;
		}
		groupsLoading.value = true;
		try {
			const data = await api.get<UserGroupInfo[]>(`/connection/groups/${connectionId}`);
			if (request === groupsRequest) groupsData.value = data;
		} catch {
			// Reported by the client; like httpResource, a failed load leaves no value.
			if (request === groupsRequest) groupsData.value = undefined;
		} finally {
			if (request === groupsRequest) groupsLoading.value = false;
		}
	}

	// A different connection drops the old list at once; refreshGroups() keeps it while reloading.
	// Sync flush: the list is cleared and loading starts in the same tick as setActiveConnection().
	watch(
		activeConnectionId,
		(id) => {
			groupsData.value = undefined;
			loadGroups(id);
		},
		{ flush: 'sync' },
	);

	function setActiveConnection(connectionId: string): void {
		activeConnectionId.value = connectionId;
	}

	function refreshGroups(): Promise<void> {
		return loadGroups(activeConnectionId.value);
	}

	// --- Cedar actions the backend knows about (was `_availablePermissionsResource`) ---
	const availablePermissions = ref<PolicyAction[]>([]);

	watch(
		() => auth.isAuthenticated,
		async (isAuthenticated) => {
			if (!isAuthenticated) {
				availablePermissions.value = [];
				return;
			}
			try {
				const data = await api.get<{ actions: PolicyAction[] }>('/permissions/available');
				availablePermissions.value = data?.actions ?? [];
			} catch {
				availablePermissions.value = [];
			}
		},
		{ immediate: true },
	);

	const availablePermissionGroups = computed<PolicyActionGroup[]>(() => {
		const byGroup = new Map<string, PolicyAction[]>();
		for (const action of availablePermissions.value) {
			const groupName = groupNameForAction(action.value);
			const list = byGroup.get(groupName);
			if (list) list.push(action);
			else byGroup.set(groupName, [action]);
		}
		return PERMISSION_GROUP_ORDER.filter((name) => byGroup.has(name)).map((name) => ({
			group: name,
			actions: byGroup.get(name) ?? [],
		}));
	});

	// --- Public (unauthenticated) access ---
	// The endpoint is connection:edit guarded while setActiveConnection runs for every URL carrying a
	// connection id, so the request waits for an explicit opt-in naming its connection: navigating to
	// another connection does not refire it against one the user may not administer.
	const publicPermissionsFor = ref<string | null>(null);
	const publicPermissionsData = ref<PublicPermissions | undefined>(undefined);
	const publicPermissionsLoading = ref(false);
	let publicPermissionsRequest = 0;

	const publicPermissions = computed<PublicPermissions>(() => publicPermissionsData.value ?? EMPTY_PUBLIC_PERMISSIONS);

	/** The connection whose public permissions may be requested, or null while not opted in. */
	const publicPermissionsKey = computed(() => {
		const id = activeConnectionId.value;
		return id && publicPermissionsFor.value === id ? id : null;
	});

	async function fetchPublicPermissions(connectionId: string | null): Promise<void> {
		const request = ++publicPermissionsRequest;
		if (!connectionId) {
			publicPermissionsData.value = undefined;
			publicPermissionsLoading.value = false;
			return;
		}
		publicPermissionsLoading.value = true;
		try {
			const data = await api.get<PublicPermissions>(`/connection/public-permissions/${connectionId}`);
			if (request === publicPermissionsRequest) publicPermissionsData.value = data;
		} catch {
			if (request === publicPermissionsRequest) publicPermissionsData.value = undefined;
		} finally {
			if (request === publicPermissionsRequest) publicPermissionsLoading.value = false;
		}
	}

	watch(
		publicPermissionsKey,
		(id) => {
			publicPermissionsData.value = undefined;
			fetchPublicPermissions(id);
		},
		{ flush: 'sync' },
	);

	function loadPublicPermissions(connectionId: string): void {
		publicPermissionsFor.value = connectionId;
	}

	async function savePublicPermissions(connectionId: string, tables: PublicTablePermission[]): Promise<void> {
		await api.put(
			`/connection/public-permissions/${connectionId}`,
			{ tables },
			{ successMessage: 'Public access has been updated.' },
		);
		await fetchPublicPermissions(publicPermissionsKey.value);
	}

	// --- Members of each group, fetched per group in parallel ---
	const groupUsers = ref<Record<string, GroupUser[] | 'empty'>>({});

	async function fetchGroupUsers(groupId: string): Promise<GroupUser[]> {
		const users = (await api.get<GroupUser[] | null>(`/group/users/${groupId}`)) ?? [];
		groupUsers.value = { ...groupUsers.value, [groupId]: users.length ? users : 'empty' };
		return users;
	}

	/** One failing group does not stop the others; each failure was already reported. */
	async function fetchAllGroupUsers(groupList: UserGroupInfo[] = groups.value): Promise<void> {
		await Promise.allSettled(groupList.map((info) => fetchGroupUsers(info.group.id)));
	}

	// --- Mutations. Each one refreshes what UsersComponent used to refresh on `groupsUpdated`. ---
	async function createGroup(connectionId: string, title: string): Promise<UserGroup | null> {
		const group = await api.post<UserGroup | null>(
			`/connection/group/${connectionId}`,
			{ title },
			{ successMessage: 'Group of users has been created.' },
		);
		if (group) refreshGroups();
		return group;
	}

	async function deleteGroup(groupId: string): Promise<void> {
		await api.delete(`/group/${groupId}`, { successMessage: 'Group has been removed.' });
		refreshGroups();
	}

	async function editGroupName(groupId: string, title: string): Promise<void> {
		await api.put('/group/title', { title, groupId }, { successMessage: 'Group name has been updated.' });
		refreshGroups();
	}

	async function saveCedarPolicy(connectionId: string, groupId: string, cedarPolicy: string): Promise<void> {
		await api.post(
			`/connection/cedar-policy/${connectionId}`,
			{ cedarPolicy, groupId },
			{ successMessage: 'Policy has been saved.' },
		);
		refreshGroups();
	}

	async function addGroupUser(groupId: string, email: string): Promise<void> {
		await api.put('/group/user', { email, groupId }, { successMessage: 'User has been added to group.' });
		fetchAllGroupUsers();
	}

	async function deleteGroupUser(email: string, groupId: string): Promise<void> {
		await api.put('/group/user/delete', { email, groupId }, { successMessage: 'User has been removed from group.' });
		fetchAllGroupUsers();
	}

	// --- Legacy endpoints (audit log, per-table permissions UI) ---
	function fetchConnectionUsers(connectionId: string): Promise<ConnectionUser[]> {
		return api.get<ConnectionUser[]>(`/connection/users/${connectionId}`, { notify: 'snackbar' });
	}

	function fetchPermission(connectionId: string, groupId: string): Promise<Permissions> {
		return api.get<Permissions>('/connection/permissions', {
			params: { connectionId, groupId },
			notify: 'snackbar',
		});
	}

	async function updatePermission(connectionId: string, permissions: Permissions): Promise<void> {
		await api.put(
			`/permissions/${permissions.group.groupId}`,
			{ permissions },
			{
				params: { connectionId },
				notify: 'snackbar',
				successMessage: 'Permissions have been updated successfully.',
			},
		);
	}

	return {
		activeConnectionId,
		groups,
		groupsLoading,
		availablePermissions,
		availablePermissionGroups,
		publicPermissions,
		publicPermissionsLoading,
		groupUsers,
		setActiveConnection,
		refreshGroups,
		loadPublicPermissions,
		savePublicPermissions,
		fetchGroupUsers,
		fetchAllGroupUsers,
		createGroup,
		deleteGroup,
		editGroupName,
		saveCedarPolicy,
		addGroupUser,
		deleteGroupUser,
		fetchConnectionUsers,
		fetchPermission,
		updatePermission,
	};
});
