import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { format, isToday } from 'date-fns';

import { CollectionViewer } from '@angular/cdk/collections';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DataSource } from '@angular/cdk/table';
import { MatPaginator } from '@angular/material/paginator';
import { UserService } from 'src/app/services/user.service';

interface Column {
  title: string,
  selected: boolean
}

interface RowsParams {
  connectionID: string,
  tableName?: string,
  userEmail: string,
  requstedPage?: number,
  filters?: object
}

export class AuditDataSource implements DataSource<Object> {

  private rowsSubject = new BehaviorSubject<Object[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public loading$ = this.loadingSubject.asObservable();
  public paginator: MatPaginator;

  constructor(private _connections: ConnectionsService, private _userService: UserService) {}

  connect(collectionViewer: CollectionViewer): Observable<Object[]> {
    return this.rowsSubject.asObservable();
  }

  disconnect(collectionViewer: CollectionViewer): void {
      this.rowsSubject.complete();
      this.loadingSubject.complete();
  }

  async fetchLogs({
    connectionID,
    tableName,
    userEmail,
    usersList
  }: RowsParams & { usersList?: any[] }) {
      this.loadingSubject.next(true);
      let effectiveUsersList = usersList;
      if (!effectiveUsersList || !Array.isArray(effectiveUsersList) || effectiveUsersList.length === 0) {
        try {
          const stored = localStorage.getItem('usersList');
          if (stored) {
            effectiveUsersList = JSON.parse(stored);
          }
        } catch (e) {}
        if ((!effectiveUsersList || !Array.isArray(effectiveUsersList) || effectiveUsersList.length === 0) && (window as any).usersList) {
          effectiveUsersList = (window as any).usersList;
        }
      }
      // Always refresh user info before using
      await this._userService.fetchUser().toPromise();
      let currentUserName = '';
      let currentUserEmail = '';
      const userValue = this._userService['user']?.getValue?.();
      console.log('DEBUG: current user from UserService', userValue);
      if (userValue) {
        currentUserName = userValue.name || '';
        currentUserEmail = userValue.email || '';
      }
      // DEBUG LOGGING
      console.log('DEBUG: effectiveUsersList', effectiveUsersList);
      if (effectiveUsersList && Array.isArray(effectiveUsersList)) {
        effectiveUsersList.forEach(u => console.log('DEBUG: user in usersList', u));
      }
      const fetchedLogs = this._connections.fetchAuditLog({
        connectionID,
        tableName,
        userEmail,
        requstedPage: this.paginator?.pageIndex + 1 || 1,
        chunkSize: this.paginator?.pageSize || 30
      });

      if (fetchedLogs) {
        fetchedLogs
        .pipe(
            catchError(() => of([])),
            finalize(() => this.loadingSubject.next(false))
        )
        .subscribe((res: any) => {
          const actions = {
            addRow: 'added row',
            deleteRow: 'deleted row',
            updateRow: 'edit row',
            rowReceived: 'received row',
            rowsReceived: 'received rows',
            ruleAction: (actionName: string) => actionName
          }
          const formattedLogs = res.logs.map(log => {
            if (log.operationType === 'actionActivated') {
              console.log('DEBUG: actionActivated log', log);
            }
            const date = new Date(log.createdAt);
            const formattedDate = format(date, "d MMM yyyy, p");
            let name = '';
            let email = log.email || '';
            // Use current user name if email matches
            if (currentUserEmail && email === currentUserEmail) {
              name = currentUserName;
            } else if (effectiveUsersList && Array.isArray(effectiveUsersList)) {
              const userProfile = effectiveUsersList.find(u => u.email === email);
              if (userProfile && userProfile.name) {
                name = userProfile.name;
              }
            }
            if (!name && log.name) name = log.name;

            // Handle action name
            let actionName = log.operationType;
            let actionIcon = null;

            if (log.operationType === 'actionActivated' && log.actionName) {
              actionName = log.actionName;
              actionIcon = log.icon;
            } else if (log.operationType === 'ruleAction' && log.actionName) {
              actionName = actions.ruleAction(log.actionName);
              actionIcon = log.icon || 'rule';
            } else {
              actionName = actions[log.operationType] || log.operationType;
            }

            return {
              ['Table']: log.table_name,
              ['User']: name || email,
              name: name,
              email: email,
              ['Action']: actionName,
              ['Date']: formattedDate,
              ['Status']: log.operationStatusResult,
              operationType: log.operationType,
              actionIcon: actionIcon,
              createdAt: log.createdAt,
              prevValue: log.old_data,
              currentValue: log.received_data,
            }
          });
          this.rowsSubject.next(formattedLogs);

          this.paginator.pageSize = res.pagination.perPage;
          this.paginator.length = res.pagination.total;
      });
    }
  }
}