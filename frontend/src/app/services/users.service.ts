import { Subject, EMPTY } from 'rxjs';
import { catchError, filter, map } from 'rxjs/operators';

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NotificationsService } from './notifications.service';
import { Permissions } from 'src/app/models/user';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private groups = new Subject<any>();
  public cast = this.groups.asObservable();

  constructor(
    private _http: HttpClient,
    private _notifications: NotificationsService
  ) { }

  fetchConnectionUsers(connectionID: string) {
    return this._http.get<any>(`/connection/users/${connectionID}`)
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  }

  fetchConnectionGroups(connectionID: string) {
    return this._http.get<any>(`/connection/groups/${connectionID}`)
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  }

  fetcGroupUsers(groupID: string) {
    return this._http.get<any>(`/group/users/${groupID}`)
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  }

  createUsersGroup(connectionID: string, title: string) {
    return this._http.post<any>(`/connection/group/${connectionID}`, {title: title})
      .pipe(
        map((res) => {
          this.groups.next({action: 'add group', group: res});
          this._notifications.showSuccessSnackbar('Group of users has been created.');
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  }

  fetchPermission(connectionID: string, groupID: string) {
    return this._http.get<any>(`/connection/permissions`, {
      params: {
        "connectionId": `${connectionID}`,
        "groupId": `${groupID}`
      }
    })
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  }

  updatePermission(connectionID: string, permissions: Permissions) {
    return this._http.put<any>(`/permissions/${permissions.group.groupId}`, {permissions}, {
        params: {"connectionId": connectionID}
      })
      .pipe(
        map(() => {
          this._notifications.showSuccessSnackbar('Permissions have been updated successfully.');
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  }

  addGroupUser(groupID: string, userEmail: string) {
    return this._http.put<any>(`/group/user`, {email: userEmail, groupId: groupID})
      .pipe(
        map((res) => {
          this.groups.next({action: 'add user', groupId: groupID});
          this._notifications.showSuccessSnackbar('User has been added to group.');
          return res;
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  }

  editUsersGroupName(groupId: string, title: string) {
    return this._http.put<any>(`/group/title`, {title, groupId})
      .pipe(
        map(() => {
          this.groups.next({action: 'edit group name', groupId: groupId});
          this._notifications.showSuccessSnackbar('Group name has been updated.')
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  }

  deleteUsersGroup(groupID: string) {
    return this._http.delete<any>(`/group/${groupID}`)
      .pipe(
        map(() => {
          this.groups.next({action: 'delete group', groupId: groupID});
          this._notifications.showSuccessSnackbar('Group has been removed.')
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  }

  deleteGroupUser(email: string, groupID: string) {
    return this._http.put<any>(`/group/user/delete`, {email: email, groupId: groupID})
      .pipe(
        map(() => {
          this.groups.next({action: 'delete user', groupId: groupID});
          this._notifications.showSuccessSnackbar('User has been removed from group.')
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  }
}