import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api/client';
import { AccessLevel, type Permissions, type UserGroupInfo } from '@/models/user';
import { useAuthStore } from '@/stores/auth';
import { useUsersStore } from './users';

vi.mock('@/api/client', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('@/router', () => ({ router: { push: vi.fn(async () => undefined) } }));

const get = vi.mocked(api.get);
const post = vi.mocked(api.post);
const put = vi.mocked(api.put);
const del = vi.mocked(api.delete);

function groupInfo(id: string, title: string): UserGroupInfo {
	return { group: { id, title, isMain: false, cedarPolicy: null, users: [] }, accessLevel: 'edit' };
}

/** Answers GET by URL; anything unexpected resolves null. */
function routeGets(responses: Record<string, unknown>) {
	get.mockImplementation(async (url: string) => (url in responses ? responses[url] : null) as never);
}

function getUrls(): string[] {
	return get.mock.calls.map(([url]) => url);
}

const permissions: Permissions = {
	connection: { connectionId: 'conn-1', accessLevel: AccessLevel.Readonly },
	group: { groupId: 'group-1', accessLevel: AccessLevel.Edit },
	tables: [
		{
			tableName: 'TOYS_TEST',
			display_name: 'Toys tests',
			accessLevel: { visibility: true, readonly: true, add: false, delete: false, edit: false },
		},
	],
};

describe('users store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		localStorage.clear();
		vi.clearAllMocks();
		routeGets({});
	});

	describe('groups', () => {
		it('loads the groups of the active connection with Admin first', async () => {
			routeGets({ '/connection/groups/conn-1': [groupInfo('g1', 'Managers'), groupInfo('g2', 'Admin')] });
			const store = useUsersStore();

			store.setActiveConnection('conn-1');
			expect(store.groupsLoading).toBe(true);
			await flushPromises();

			expect(store.groups.map((info) => info.group.title)).toEqual(['Admin', 'Managers']);
			expect(store.groupsLoading).toBe(false);
		});

		it('does not refetch when the same connection is set again', async () => {
			const store = useUsersStore();
			store.setActiveConnection('conn-1');
			await flushPromises();
			store.setActiveConnection('conn-1');
			await flushPromises();

			expect(getUrls().filter((url) => url === '/connection/groups/conn-1')).toHaveLength(1);
		});

		it('drops the previous connection groups when switching, and ignores a stale response', async () => {
			let resolveFirst: (value: UserGroupInfo[]) => void = () => {};
			get.mockImplementation((url: string) => {
				if (url === '/connection/groups/conn-a') return new Promise((resolve) => (resolveFirst = resolve)) as never;
				if (url === '/connection/groups/conn-b') return Promise.resolve([groupInfo('b1', 'B')]) as never;
				return Promise.resolve(null) as never;
			});
			const store = useUsersStore();

			store.setActiveConnection('conn-a');
			await flushPromises();
			store.setActiveConnection('conn-b');
			await flushPromises();
			resolveFirst([groupInfo('a1', 'A')]);
			await flushPromises();

			expect(store.groups.map((info) => info.group.id)).toEqual(['b1']);
		});
	});

	describe('available permissions', () => {
		it('are fetched only for a signed-in user and grouped in display order', async () => {
			routeGets({
				'/permissions/available': {
					actions: [
						{ value: 'table:read', label: 'Read table' },
						{ value: 'connection:read', label: 'Read connection' },
					],
				},
			});
			const auth = useAuthStore();
			const store = useUsersStore();
			await flushPromises();
			expect(getUrls()).not.toContain('/permissions/available');

			auth.setAuthenticated(true);
			await flushPromises();

			expect(store.availablePermissions).toHaveLength(2);
			expect(store.availablePermissionGroups.map((group) => group.group)).toEqual(['Connection', 'Table']);
		});
	});

	describe('group mutations refresh what changed', () => {
		it('creates a group and reloads the groups', async () => {
			const group = { id: 'g1', title: 'Managers', isMain: false };
			post.mockResolvedValueOnce(group);
			const store = useUsersStore();
			store.setActiveConnection('conn-1');
			await flushPromises();
			get.mockClear();

			await expect(store.createGroup('conn-1', 'Managers')).resolves.toEqual(group);
			await flushPromises();

			expect(post).toHaveBeenCalledWith(
				'/connection/group/conn-1',
				{ title: 'Managers' },
				{ successMessage: 'Group of users has been created.' },
			);
			expect(getUrls()).toEqual(['/connection/groups/conn-1']);
		});

		it('deletes and renames a group', async () => {
			del.mockResolvedValueOnce({});
			put.mockResolvedValueOnce({});
			const store = useUsersStore();
			store.setActiveConnection('conn-1');
			await flushPromises();
			get.mockClear();

			await store.deleteGroup('g1');
			await store.editGroupName('g2', 'New Title');
			await flushPromises();

			expect(del).toHaveBeenCalledWith('/group/g1', { successMessage: 'Group has been removed.' });
			expect(put).toHaveBeenCalledWith(
				'/group/title',
				{ title: 'New Title', groupId: 'g2' },
				{ successMessage: 'Group name has been updated.' },
			);
			expect(getUrls()).toEqual(['/connection/groups/conn-1', '/connection/groups/conn-1']);
		});

		it('saves a Cedar policy and reloads the groups', async () => {
			post.mockResolvedValueOnce({});
			const store = useUsersStore();
			store.setActiveConnection('conn-1');
			await flushPromises();
			get.mockClear();

			await store.saveCedarPolicy('conn-1', 'g1', 'permit(...)');
			await flushPromises();

			expect(post).toHaveBeenCalledWith(
				'/connection/cedar-policy/conn-1',
				{ cedarPolicy: 'permit(...)', groupId: 'g1' },
				{ successMessage: 'Policy has been saved.' },
			);
			expect(getUrls()).toEqual(['/connection/groups/conn-1']);
		});

		it('does not refresh when the mutation fails', async () => {
			del.mockRejectedValueOnce(new Error('denied'));
			const store = useUsersStore();
			store.setActiveConnection('conn-1');
			await flushPromises();
			get.mockClear();

			await expect(store.deleteGroup('g1')).rejects.toThrow('denied');
			expect(get).not.toHaveBeenCalled();
		});

		it('adds and removes group users, then refetches every group members', async () => {
			put.mockResolvedValue({});
			routeGets({
				'/connection/groups/conn-1': [groupInfo('g1', 'Admin'), groupInfo('g2', 'Managers')],
				'/group/users/g1': [{ id: 'u1', email: 'a@b.c' }],
				'/group/users/g2': [],
			});
			const store = useUsersStore();
			store.setActiveConnection('conn-1');
			await flushPromises();

			await store.addGroupUser('g1', 'eric.cartman@south.park');
			await flushPromises();
			expect(put).toHaveBeenCalledWith(
				'/group/user',
				{ email: 'eric.cartman@south.park', groupId: 'g1' },
				{ successMessage: 'User has been added to group.' },
			);
			expect(store.groupUsers).toEqual({ g1: [{ id: 'u1', email: 'a@b.c' }], g2: 'empty' });

			get.mockClear();
			await store.deleteGroupUser('eric.cartman@south.park', 'g1');
			await flushPromises();
			expect(put).toHaveBeenCalledWith(
				'/group/user/delete',
				{ email: 'eric.cartman@south.park', groupId: 'g1' },
				{ successMessage: 'User has been removed from group.' },
			);
			expect(getUrls().sort()).toEqual(['/group/users/g1', '/group/users/g2']);
		});
	});

	describe('group users', () => {
		it('stores the members of a group, or "empty"', async () => {
			const users = [{ id: 'user-1', createdAt: '', gclid: null, isActive: true, email: 'a@b.com' }];
			routeGets({ '/group/users/group-1': users, '/group/users/group-2': [] });
			const store = useUsersStore();

			await expect(store.fetchGroupUsers('group-1')).resolves.toEqual(users);
			await store.fetchGroupUsers('group-2');

			expect(store.groupUsers['group-1']).toEqual(users);
			expect(store.groupUsers['group-2']).toBe('empty');
		});

		it('keeps loading the other groups when one fails', async () => {
			get.mockImplementation((url: string) => {
				if (url === '/group/users/g1') return Promise.reject(new Error('fail')) as never;
				return Promise.resolve([{ id: 'u2' }]) as never;
			});
			const store = useUsersStore();

			await store.fetchAllGroupUsers([groupInfo('g1', 'A'), groupInfo('g2', 'B')]);

			expect(store.groupUsers).toEqual({ g2: [{ id: 'u2' }] });
		});
	});

	describe('public permissions', () => {
		it('are not requested until opted in', async () => {
			const store = useUsersStore();
			store.setActiveConnection('conn-a');
			await flushPromises();

			expect(getUrls()).not.toContain('/connection/public-permissions/conn-a');
			expect(store.publicPermissions).toEqual({ enabled: false, tables: [] });
		});

		it('are requested once opted in for the active connection', async () => {
			routeGets({ '/connection/public-permissions/conn-a': { enabled: true, tables: [{ tableName: 'users' }] } });
			const store = useUsersStore();
			store.setActiveConnection('conn-a');
			store.loadPublicPermissions('conn-a');
			await flushPromises();

			expect(store.publicPermissions).toEqual({ enabled: true, tables: [{ tableName: 'users' }] });
		});

		it('do not carry the opt-in over to another connection', async () => {
			const store = useUsersStore();
			store.setActiveConnection('conn-a');
			store.loadPublicPermissions('conn-a');
			await flushPromises();
			get.mockClear();

			store.setActiveConnection('conn-b');
			await flushPromises();

			expect(getUrls()).not.toContain('/connection/public-permissions/conn-b');
			expect(store.publicPermissions).toEqual({ enabled: false, tables: [] });
		});

		it('are saved, and reloaded afterwards', async () => {
			put.mockResolvedValueOnce({});
			const store = useUsersStore();
			store.setActiveConnection('conn-a');
			store.loadPublicPermissions('conn-a');
			await flushPromises();
			get.mockClear();

			await store.savePublicPermissions('conn-a', [{ tableName: 'users', readableColumns: ['id', 'name'] }]);

			expect(put).toHaveBeenCalledWith(
				'/connection/public-permissions/conn-a',
				{ tables: [{ tableName: 'users', readableColumns: ['id', 'name'] }] },
				{ successMessage: 'Public access has been updated.' },
			);
			expect(getUrls()).toEqual(['/connection/public-permissions/conn-a']);
		});

		it('are disabled by saving an empty table list', async () => {
			put.mockResolvedValueOnce({});
			await useUsersStore().savePublicPermissions('conn-a', []);

			expect(put).toHaveBeenCalledWith(
				'/connection/public-permissions/conn-a',
				{ tables: [] },
				{ successMessage: 'Public access has been updated.' },
			);
		});
	});

	describe('legacy endpoints', () => {
		it('fetches the connection users with snackbar errors', async () => {
			const users = [{ id: 'u1', isActive: true, email: 'lyubov@voloshko.com', createdAt: '' }];
			routeGets({ '/connection/users/conn-1': users });

			await expect(useUsersStore().fetchConnectionUsers('conn-1')).resolves.toEqual(users);
			expect(get).toHaveBeenCalledWith('/connection/users/conn-1', { notify: 'snackbar' });
		});

		it('fetches the permissions of a group', async () => {
			routeGets({ '/connection/permissions': permissions });

			await expect(useUsersStore().fetchPermission('conn-1', 'group-1')).resolves.toEqual(permissions);
			expect(get).toHaveBeenCalledWith('/connection/permissions', {
				params: { connectionId: 'conn-1', groupId: 'group-1' },
				notify: 'snackbar',
			});
		});

		it('updates the permissions of a group', async () => {
			put.mockResolvedValueOnce(permissions);

			await useUsersStore().updatePermission('conn-1', permissions);

			expect(put).toHaveBeenCalledWith(
				'/permissions/group-1',
				{ permissions },
				{
					params: { connectionId: 'conn-1' },
					notify: 'snackbar',
					successMessage: 'Permissions have been updated successfully.',
				},
			);
		});
	});
});
