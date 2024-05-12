import { Component, OnDestroy, OnInit } from '@angular/core';
import { GroupUser, User, UserGroup, UserGroupInfo } from 'src/app/models/user';

import { Angulartics2 } from 'angulartics2';
import { Connection } from 'src/app/models/connection';
import { ConnectionsService } from 'src/app/services/connections.service';
import { GroupAddDialogComponent } from './group-add-dialog/group-add-dialog.component';
import { GroupDeleteDialogComponent } from './group-delete-dialog/group-delete-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { PermissionsAddDialogComponent } from './permissions-add-dialog/permissions-add-dialog.component';
import { Subscription, first } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { UserAddDialogComponent } from './user-add-dialog/user-add-dialog.component';
import { UserDeleteDialogComponent } from './user-delete-dialog/user-delete-dialog.component';
import { UserService } from 'src/app/services/user.service';
import { UsersService } from '../../services/users.service';
import { GroupNameEditDialogComponent } from './group-name-edit-dialog/group-name-edit-dialog.component';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit, OnDestroy {

  public users: { [key: string]: GroupUser[] | 'empty' } = {};
  public currentUser: User;
  public groups: UserGroupInfo[] | null = null;
  public currentConnection: Connection;
  public connectionID: string | null = null;

  private getTitleSubscription: Subscription;

  constructor(
    private _usersService: UsersService,
    private _userService: UserService,
    private _connections: ConnectionsService,
    public dialog: MatDialog,
    private title: Title,
    private angulartics2: Angulartics2,
  ) { }

  ngOnInit() {
    this.getTitleSubscription = this._connections.getCurrentConnectionTitle().subscribe(connectionTitle => {
      this.title.setTitle(`User permissions - ${connectionTitle} | Rocketadmin`);
    });
    this.connectionID = this._connections.currentConnectionID;
    this.getUsersGroups();
    this._userService.cast.subscribe(user => this.currentUser = user);
    this._usersService.cast.subscribe( arg =>  {
      if (arg.action === 'add group' || arg.action === 'delete group' || arg.action === 'edit group name') {
        this.getUsersGroups()

        if (arg.action === 'add group') {
          console.log('ngOnInit _usersService.cast.subscribe');
          console.log(arg);
          this.openPermissionsDialog(arg.group);
        }
      } else if (arg.action === 'add user' || arg.action === 'delete user') {
        this.fetchGroupUsers(arg.groupId);
      };
    });
  }

  ngOnDestroy() {
    this.getTitleSubscription.unsubscribe();
  }

  get connectionAccessLevel() {
    return this._connections.currentConnectionAccessLevel || 'none';
  }

  isPermitted(accessLevel) {
    return accessLevel === 'fullaccess' || accessLevel === 'edit'
  }

  getUsersGroups() {
    this._usersService.fetchConnectionGroups(this.connectionID)
      .subscribe((res: any) => {
        this.groups = res;
      });
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
    this.dialog.open(UserAddDialogComponent, {
      width: '25em',
      data: group
    })
  }

  openDeleteGroupDialog(group: UserGroup) {
    this.dialog.open(GroupDeleteDialogComponent, {
      width: '25em',
      data: group
    })
  }

  openEditGroupNameDialog(group: UserGroup) {
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

  openUsersList(groupID: string) {
    if (!this.users[groupID]) {
      this.users[groupID] = null;
      this.fetchGroupUsers(groupID);
    };
  }

  fetchGroupUsers(groupID: string) {
    this._usersService.fetcGroupUsers(groupID)
      .subscribe(res => {
        if (res.length) {
          let groupUsers = [...res];
          const userIndex = groupUsers.findIndex(user => user.email === this.currentUser.email);

          if (userIndex !== -1) {
            const user = groupUsers.splice(userIndex, 1)[0];
            groupUsers.unshift(user);
          }

          this.users[groupID] = groupUsers;
        } else {
          this.users[groupID] = 'empty';
        };
      })
  }
}
