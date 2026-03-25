import { Component, computed, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatAccordion, MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Title } from '@angular/platform-browser';
import { Angulartics2, Angulartics2OnModule } from 'angulartics2';
import { differenceBy } from 'lodash-es';
import posthog from 'posthog-js';
import { take } from 'rxjs';
import { GroupUser, User, UserGroup } from 'src/app/models/user';
import { CompanyService } from 'src/app/services/company.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { UserService } from 'src/app/services/user.service';
import { UsersService } from '../../services/users.service';
import { PlaceholderUserGroupComponent } from '../skeletons/placeholder-user-group/placeholder-user-group.component';
import { PlaceholderUserGroupsComponent } from '../skeletons/placeholder-user-groups/placeholder-user-groups.component';
import { CedarPolicyEditorDialogComponent } from './cedar-policy-editor-dialog/cedar-policy-editor-dialog.component';
import { GroupAddDialogComponent } from './group-add-dialog/group-add-dialog.component';
import { GroupDeleteDialogComponent } from './group-delete-dialog/group-delete-dialog.component';
import { GroupNameEditDialogComponent } from './group-name-edit-dialog/group-name-edit-dialog.component';
import { UserAddDialogComponent } from './user-add-dialog/user-add-dialog.component';
import { UserDeleteDialogComponent } from './user-delete-dialog/user-delete-dialog.component';

@Component({
	selector: 'app-users',
	imports: [
		MatButtonModule,
		MatIconModule,
		MatListModule,
		MatExpansionModule,
		MatAccordion,
		MatTooltipModule,
		Angulartics2OnModule,
		PlaceholderUserGroupsComponent,
		PlaceholderUserGroupComponent,
	],
	templateUrl: './users.component.html',
	styleUrls: ['./users.component.css'],
})
export class UsersComponent implements OnInit {
	private _usersService = inject(UsersService);
	private _userService = inject(UserService);
	private _connections = inject(ConnectionsService);
	private _company = inject(CompanyService);
	private _dialog = inject(MatDialog);
	private _title = inject(Title);
	private _destroyRef = inject(DestroyRef);

	protected posthog = posthog;
	protected connectionID: string | null = null;

	protected currentUser = signal<User | null>(null);
	// biome-ignore lint/suspicious/noExplicitAny: legacy company member type
	protected companyMembers = signal<any[]>([]);

	protected groups = computed(() => {
		const g = this._usersService.groups();
		return g.length > 0 || !this._usersService.groupsLoading() ? g : null;
	});

	protected groupUsers = this._usersService.groupUsers;

	protected companyMembersWithoutAccess = computed(() => {
		const members = this.companyMembers();
		const users = this.groupUsers();
		const allGroupUsers = Object.values(users).flat();
		return differenceBy(members, allGroupUsers, 'email');
	});

	constructor() {
		// React to group update events
		effect(() => {
			const action = this._usersService.groupsUpdated();
			if (!action) return;

			if (action === 'user-added' || action === 'user-deleted') {
				// Refresh all group users to get updated data
				const currentGroups = this._usersService.groups();
				if (currentGroups.length) {
					this._usersService.fetchAllGroupUsers(currentGroups);
				}
			} else {
				// Group-level changes: refresh groups resource, then users
				this._usersService.refreshGroups();
			}
			this._usersService.clearGroupsUpdated();
		});

		// Fetch group users when groups load
		effect(() => {
			const groups = this._usersService.groups();
			if (groups.length > 0) {
				this._usersService.fetchAllGroupUsers(groups);
			}
		});
	}

	ngOnInit() {
		this.connectionID = this._connections.currentConnectionID;

		this._connections
			.getCurrentConnectionTitle()
			.pipe(take(1))
			.subscribe((connectionTitle) => {
				this._title.setTitle(
					`User permissions - ${connectionTitle} | ${this._company.companyTabTitle || 'Rocketadmin'}`,
				);
			});

		this._usersService.setActiveConnection(this.connectionID);

		this._userService.cast.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((user) => {
			this.currentUser.set(user);

			this._company.fetchCompanyMembers(user.company.id).subscribe((members) => {
				this.companyMembers.set(members);
			});
		});
	}

	get connectionAccessLevel() {
		return this._connections.currentConnectionAccessLevel || 'none';
	}

	isPermitted(accessLevel: string) {
		return accessLevel === 'fullaccess' || accessLevel === 'edit';
	}

	getGroupUsers(groupId: string): GroupUser[] | null {
		const val = this.groupUsers()[groupId];
		if (!val || val === 'empty') return null;
		return val;
	}

	getUserInitials(user: GroupUser): string {
		const name = user.name;
		if (name) {
			const parts = name.trim().split(/\s+/);
			if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
			return parts[0][0].toUpperCase();
		}
		return user.email[0].toUpperCase();
	}

	openCreateUsersGroupDialog(event: Event) {
		event.preventDefault();
		event.stopImmediatePropagation();
		const dialogRef = this._dialog.open(GroupAddDialogComponent, {
			width: '25em',
		});
		dialogRef.afterClosed().subscribe((createdGroup) => {
			if (createdGroup) {
				this._dialog.open(CedarPolicyEditorDialogComponent, {
					width: '40em',
					data: { groupId: createdGroup.id, groupTitle: createdGroup.title, cedarPolicy: null },
				});
			}
		});
	}

	openAddUserDialog(group: UserGroup) {
		const groupUsersList = this.groupUsers()[group.id];
		const availableMembers = differenceBy(
			this.companyMembers(),
			groupUsersList === 'empty' ? [] : ((groupUsersList as []) ?? []),
			'email',
		);
		this._dialog.open(UserAddDialogComponent, {
			width: '25em',
			data: { availableMembers, group },
		});
	}

	openDeleteGroupDialog(group: UserGroup) {
		this._dialog.open(GroupDeleteDialogComponent, {
			width: '25em',
			data: group,
		});
	}

	openEditGroupNameDialog(e: Event, group: UserGroup) {
		e.stopPropagation();
		this._dialog.open(GroupNameEditDialogComponent, {
			width: '25em',
			data: group,
		});
	}

	openCedarPolicyDialog(group: UserGroup) {
		this._dialog.open(CedarPolicyEditorDialogComponent, {
			width: '40em',
			data: { groupId: group.id, groupTitle: group.title, cedarPolicy: group.cedarPolicy },
		});
	}

	openDeleteUserDialog(user: GroupUser, group: UserGroup) {
		this._dialog.open(UserDeleteDialogComponent, {
			width: '25em',
			data: { user, group },
		});
	}
}
