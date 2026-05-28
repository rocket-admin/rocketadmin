import { HttpClient, HttpResourceRef } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import { catchError, EMPTY, map } from 'rxjs';
import { PolicyAction, PolicyActionGroup } from 'src/app/lib/cedar-policy-items';
import { groupNameForAction, PERMISSION_GROUP_ORDER } from 'src/app/lib/permission-display';
import { GroupUser, Permissions, UserGroup, UserGroupInfo } from 'src/app/models/user';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { NotificationsService } from './notifications.service';

export type GroupUpdateEvent =
	| 'group-added'
	| 'group-deleted'
	| 'group-renamed'
	| 'policy-saved'
	| 'user-added'
	| 'user-deleted'
	| '';

@Injectable({
	providedIn: 'root',
})
export class UsersService {
	private _api = inject(ApiService);
	private _auth = inject(AuthService);
	private _http = inject(HttpClient);
	private _notifications = inject(NotificationsService);

	// Reactive groups fetching
	private _activeConnectionId = signal<string | null>(null);

	private _groupsUpdated = signal<GroupUpdateEvent>('');
	public readonly groupsUpdated = this._groupsUpdated.asReadonly();

	private _groupsResource: HttpResourceRef<UserGroupInfo[] | undefined> = this._api.resource<UserGroupInfo[]>(() => {
		const id = this._activeConnectionId();
		if (!id) return undefined;
		return `/connection/groups/${id}`;
	});

	public readonly groups = computed(() => {
		const raw = this._groupsResource.value() ?? [];
		return [...raw].sort((a, b) => {
			if (a.group.title === 'Admin') return -1;
			if (b.group.title === 'Admin') return 1;
			return 0;
		});
	});
	public readonly groupsLoading = computed(() => this._groupsResource.isLoading());

	private _availablePermissionsResource: HttpResourceRef<{ actions: PolicyAction[] } | undefined> = this._api.resource<{
		actions: PolicyAction[];
	}>(() => (this._auth.isAuthenticated() ? '/permissions/available' : undefined));

	public readonly availablePermissions = computed<PolicyAction[]>(
		() => this._availablePermissionsResource.value()?.actions ?? [],
	);

	public readonly availablePermissionGroups = computed<PolicyActionGroup[]>(() => {
		const byGroup = new Map<string, PolicyAction[]>();
		for (const action of this.availablePermissions()) {
			const groupName = groupNameForAction(action.value);
			const list = byGroup.get(groupName);
			if (list) list.push(action);
			else byGroup.set(groupName, [action]);
		}
		return PERMISSION_GROUP_ORDER.filter((name) => byGroup.has(name)).map((name) => ({
			group: name,
			actions: byGroup.get(name)!,
		}));
	});

	// Group users - managed imperatively (per-group parallel fetch)
	private _groupUsers = signal<Record<string, GroupUser[] | 'empty'>>({});
	public readonly groupUsers = this._groupUsers.asReadonly();

	setActiveConnection(id: string): void {
		this._activeConnectionId.set(id);
	}

	refreshGroups(): void {
		this._groupsResource.reload();
	}

	clearGroupsUpdated(): void {
		this._groupsUpdated.set('');
	}

	async fetchGroupUsers(groupId: string): Promise<GroupUser[]> {
		const users = await this._api.get<GroupUser[]>(`/group/users/${groupId}`);
		const result = users ?? [];
		this._groupUsers.update((current) => ({
			...current,
			[groupId]: result.length ? result : 'empty',
		}));
		return result;
	}

	async fetchAllGroupUsers(groups: UserGroupInfo[]): Promise<void> {
		await Promise.all(groups.map((g) => this.fetchGroupUsers(g.group.id)));
	}

	// Mutations
	async createGroup(connectionId: string, title: string): Promise<UserGroup | null> {
		const group = await this._api.post<UserGroup>(
			`/connection/group/${connectionId}`,
			{ title },
			{
				successMessage: 'Group of users has been created.',
			},
		);
		if (group) this._groupsUpdated.set('group-added');
		return group;
	}

	async deleteGroup(groupId: string): Promise<void> {
		await this._api.delete(`/group/${groupId}`, {
			successMessage: 'Group has been removed.',
		});
		this._groupsUpdated.set('group-deleted');
	}

	async editGroupName(groupId: string, title: string): Promise<void> {
		await this._api.put(
			'/group/title',
			{ title, groupId },
			{
				successMessage: 'Group name has been updated.',
			},
		);
		this._groupsUpdated.set('group-renamed');
	}

	async saveCedarPolicy(connectionId: string, groupId: string, cedarPolicy: string): Promise<void> {
		await this._api.post(
			`/connection/cedar-policy/${connectionId}`,
			{ cedarPolicy, groupId },
			{
				successMessage: 'Policy has been saved.',
			},
		);
		this.refreshGroups();
		this._groupsUpdated.set('policy-saved');
	}

	async addGroupUser(groupId: string, email: string): Promise<void> {
		await this._api.put(
			'/group/user',
			{ email, groupId },
			{
				successMessage: 'User has been added to group.',
			},
		);
		this._groupsUpdated.set('user-added');
	}

	async deleteGroupUser(email: string, groupId: string): Promise<void> {
		await this._api.put(
			'/group/user/delete',
			{ email, groupId },
			{
				successMessage: 'User has been removed from group.',
			},
		);
		this._groupsUpdated.set('user-deleted');
	}

	// Legacy Observable methods (kept for AuditComponent + permissions UI)
	fetchConnectionUsers(connectionID: string) {
		return this._http.get<any>(`/connection/users/${connectionID}`).pipe(
			map((res) => res),
			catchError((err) => {
				console.log(err);
				this._notifications.showErrorSnackbar(err.error?.message || err.message);
				return EMPTY;
			}),
		);
	}

	fetchPermission(connectionID: string, groupID: string) {
		return this._http
			.get<any>(`/connection/permissions`, {
				params: {
					connectionId: `${connectionID}`,
					groupId: `${groupID}`,
				},
			})
			.pipe(
				map((res) => res),
				catchError((err) => {
					console.log(err);
					this._notifications.showErrorSnackbar(err.error?.message || err.message);
					return EMPTY;
				}),
			);
	}

	updatePermission(connectionID: string, permissions: Permissions) {
		return this._http
			.put<any>(
				`/permissions/${permissions.group.groupId}`,
				{ permissions },
				{
					params: { connectionId: connectionID },
				},
			)
			.pipe(
				map(() => {
					this._notifications.showSuccessSnackbar('Permissions have been updated successfully.');
				}),
				catchError((err) => {
					console.log(err);
					this._notifications.showErrorSnackbar(err.error?.message || err.message);
					return EMPTY;
				}),
			);
	}
}
