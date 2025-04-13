import { CommonModule, NgClass, NgForOf, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { GroupUser, User, UserGroup, UserGroupInfo } from 'src/app/models/user';
import { MatAccordion, MatExpansionModule } from '@angular/material/expansion';
import { Observable, Subscription, first, forkJoin, take, tap } from 'rxjs';

import { Angulartics2 } from 'angulartics2';
import { Angulartics2OnModule } from 'angulartics2';
import { CompanyService } from 'src/app/services/company.service';
import { Connection } from 'src/app/models/connection';
import { ConnectionsService } from 'src/app/services/connections.service';
import { GroupAddDialogComponent } from './group-add-dialog/group-add-dialog.component';
import { GroupDeleteDialogComponent } from './group-delete-dialog/group-delete-dialog.component';
import { GroupNameEditDialogComponent } from './group-name-edit-dialog/group-name-edit-dialog.component';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PermissionsAddDialogComponent } from './permissions-add-dialog/permissions-add-dialog.component';
import { PlaceholderUserGroupComponent } from '../skeletons/placeholder-user-group/placeholder-user-group.component';
import { PlaceholderUserGroupsComponent } from '../skeletons/placeholder-user-groups/placeholder-user-groups.component';
import { Title } from '@angular/platform-browser';
import { UserAddDialogComponent } from './user-add-dialog/user-add-dialog.component';
import { UserDeleteDialogComponent } from './user-delete-dialog/user-delete-dialog.component';
import { UserService } from 'src/app/services/user.service';
import { UsersService } from '../../services/users.service';
import { differenceBy } from "lodash";

@Component({
  selector: 'app-users',
  imports: [
    NgIf,
    NgForOf,
    NgClass,
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatExpansionModule,
    MatAccordion,
    MatTooltipModule,
    Angulartics2OnModule,
    PlaceholderUserGroupsComponent,
    PlaceholderUserGroupComponent
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit, OnDestroy {

  public users: { [key: string]: GroupUser[] | 'empty' } = {};
  public currentUser: User;
  public groups: UserGroupInfo[] | null = null;
  public currentConnection: Connection;
  public connectionID: string | null = null;
  public companyMembers: [];
  public companyMembersWithoutAccess: any = [];

  private getTitleSubscription: Subscription;
  private usersSubscription: Subscription;

  constructor(
    private _usersService: UsersService,
    private _userService: UserService,
    private _connections: ConnectionsService,
    private _company: CompanyService,
    public dialog: MatDialog,
    private title: Title,
    private angulartics2: Angulartics2,
  ) { }

  ngOnInit() {
    this._connections.getCurrentConnectionTitle()
      .pipe(take(1))
      .subscribe(connectionTitle => {
        this.title.setTitle(`User permissions - ${connectionTitle} | ${this._company.companyTabTitle || 'Rocketadmin'}`);
      });
    this.connectionID = this._connections.currentConnectionID;
    this.getUsersGroups();

    this._userService.cast.subscribe(user => {
      this.currentUser = user

      this._company.fetchCompanyMembers(this.currentUser.company.id).subscribe(members => {
        this.companyMembers = members;
      })
    });

    this.usersSubscription = this._usersService.cast.subscribe( arg =>  {
      if (arg.action === 'add group' || arg.action === 'delete group' || arg.action === 'edit group name') {
        this.getUsersGroups()

        if (arg.action === 'add group') {
          this.openPermissionsDialog(arg.group);
        }
      } else if (arg.action === 'add user' || arg.action === 'delete user') {
        this.fetchAndPopulateGroupUsers(arg.groupId).subscribe({
          next: updatedUsers => {
            // `this.users[groupId]` is now updated.
            // `updatedUsers` is the raw array from the server (if you need it).
            this.getCompanyMembersWithoutAccess();

            console.log(`Group ${arg.groupId} updated:`, updatedUsers);
          },
          error: err => console.error(`Failed to update group ${arg.groupId}:`, err)
        });
      };
    });
  }

  ngOnDestroy() {
    this.usersSubscription.unsubscribe();
  }

  get connectionAccessLevel() {
    return this._connections.currentConnectionAccessLevel || 'none';
  }

  isPermitted(accessLevel) {
    return accessLevel === 'fullaccess' || accessLevel === 'edit'
  }

  getUsersGroups() {
    this._usersService.fetchConnectionGroups(this.connectionID)
      .subscribe((groups: any) => {
        // Sort Admin to the front
        this.groups = groups.sort((a, b) => {
          if (a.group.title === 'Admin') return -1;
          if (b.group.title === 'Admin') return 1;
          return 0;
        });

        // Create an array of Observables based on each group
        const groupRequests = this.groups.map(groupItem => {
          return this.fetchAndPopulateGroupUsers(groupItem.group.id);
        });

        // Wait until all these Observables complete
        forkJoin(groupRequests).subscribe({
          next: results => {
            // Here, 'results' is an array of the user arrays from each group.
            // By this point, this.users[...] is updated for ALL groups.
            // Update any shared state
            this.getCompanyMembersWithoutAccess();
          },
          error: err => console.error('Error in group fetch:', err)
        });
      });
  }

  fetchAndPopulateGroupUsers(groupId: string): Observable<any[]> {
    return this._usersService.fetcGroupUsers(groupId).pipe(
      tap((res: any[]) => {
        if (res.length) {
          let groupUsers = [...res];
          const userIndex = groupUsers.findIndex(user => user.email === this.currentUser.email);

          if (userIndex !== -1) {
            const user = groupUsers.splice(userIndex, 1)[0];
            groupUsers.unshift(user);
          }

          this.users[groupId] = groupUsers;
        } else {
          this.users[groupId] = 'empty';
        }
      })
    );
  }

  getCompanyMembersWithoutAccess() {
    const allGroupUsers = Object.values(this.users).flat();
    this.companyMembersWithoutAccess = differenceBy(this.companyMembers, allGroupUsers, 'email');
  }

  openCreateUsersGroupDialog(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    this.dialog.open(GroupAddDialogComponent, {
      width: '25em',
    });
  }

  openPermissionsDialog(group: UserGroup) {
    this.dialog.open(PermissionsAddDialogComponent, {
      width: '50em',
      data: group
    })
  }

  openAddUserDialog(group: UserGroup) {
    const availableMembers = differenceBy(this.companyMembers, this.users[group.id] as [], 'email');
    this.dialog.open(UserAddDialogComponent, {
      width: '25em',
      data: { availableMembers, group }
    })
  }

  openDeleteGroupDialog(group: UserGroup) {
    this.dialog.open(GroupDeleteDialogComponent, {
      width: '25em',
      data: group
    })
  }

  openEditGroupNameDialog(e: Event, group: UserGroup) {
    e.stopPropagation();
    this.dialog.open(GroupNameEditDialogComponent, {
      width: '25em',
      data: group
    })
  }

  openDeleteUserDialog(user: GroupUser, group: UserGroup) {
    this.dialog.open(UserDeleteDialogComponent, {
      width: '25em',
      data: {user, group}
    })
  }
}
