import { BehaviorSubject, EMPTY } from 'rxjs';
import { catchError, filter, map } from 'rxjs/operators';

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NotificationsService } from './notifications.service';
import { Permissions } from 'src/app/models/user';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  _connectionGroupsURL = 'https://api-v2.autoadmin.org/connection/groups';
  _connectionGroupURL = 'https://api-v2.autoadmin.org/connection/group';
  _connectionURL = 'https://api-v2.autoadmin.org/connection';
  _groupURL = 'https://api-v2.autoadmin.org/group';
  _groupsURL = 'https://api-v2.autoadmin.org/groups';
  _permissionURL = 'https://api-v2.autoadmin.org/permission'
  _permissionsURL = 'https://api-v2.autoadmin.org/permissions'

  private groups = new BehaviorSubject<string>('');
  public cast = this.groups.asObservable();

  constructor(
    private _http: HttpClient,
    private _notifications: NotificationsService
  ) { }

  fetchConnectionUsers(connectionID: string) {
    return this._http.get<any>(`${this._connectionURL}/users/${connectionID}`)
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
    return this._http.get<any>(`${this._connectionGroupsURL}/${connectionID}`)
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
    return this._http.get<any>(`${this._groupURL}/users/${groupID}`)
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
    return this._http.post<any>(`${this._connectionGroupURL}/${connectionID}`, {title: title})
      .pipe(
        map(() => {
          this.groups.next('groups');
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
    return this._http.get<any>(`${this._connectionURL}/permissions`, {
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

  updatePermission(permissions: Permissions) {
    return this._http.put<any>(`${this._permissionsURL}/${permissions.group.groupId}`, {permissions})
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
    return this._http.put<any>(`${this._groupURL}/user`, {email: userEmail, groupId: groupID})
      .pipe(
        map((res) => {
          this.groups.next(groupID);
          // this._notifications.showSuccessSnackbar('User has been added to group.');
          return res;
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  }

  deleteUsersGroup(groupID: string) {
    return this._http.delete<any>(`${this._groupURL}/${groupID}`)
      .pipe(
        map(() => {
          this.groups.next('groups');
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
    return this._http.put<any>(`${this._groupURL}/user/delete`, {email: email, groupId: groupID})
      .pipe(
        map(() => {
          this.groups.next(groupID);
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