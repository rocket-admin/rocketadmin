import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { format, isToday } from 'date-fns';

import { CollectionViewer } from '@angular/cdk/collections';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DataSource } from '@angular/cdk/table';
import { MatPaginator } from '@angular/material/paginator';

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

  constructor(private _connections: ConnectionsService) {}

  connect(collectionViewer: CollectionViewer): Observable<Object[]> {
    return this.rowsSubject.asObservable();
  }

  disconnect(collectionViewer: CollectionViewer): void {
      this.rowsSubject.complete();
      this.loadingSubject.complete();
  }

  fetchLogs({
    connectionID,
    tableName,
    userEmail
  }: RowsParams) {
      this.loadingSubject.next(true);
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
            const date = new Date(log.createdAt);
            const formattedDate = format(date, "d MMM yyyy, p");

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
              ['User']: log.email,
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