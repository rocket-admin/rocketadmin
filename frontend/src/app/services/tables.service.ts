import { AlertActionType, AlertType } from '../models/alert';
import { BehaviorSubject, EMPTY, throwError } from 'rxjs';
import { CustomAction, Rule, TableSettings, Widget } from '../models/table';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { catchError, filter, map } from 'rxjs/operators';

import { Angulartics2 } from 'angulartics2';
import { Injectable } from '@angular/core';
import { NotificationsService } from './notifications.service';

export enum SortOrdering {
  Ascending = 'ASC',
  Descending = 'DESC'
}

interface TableParams {
  connectionID: string,
  tableName: string,
  requstedPage?: number,
  chunkSize?: number,
  sortColumn?: string,
  sortOrder?: 'ASC' | 'DESC',
  foreignKeyRowName?: string,
  foreignKeyRowValue?: string,
  referencedColumn?:string,
  filters?: object,
  comparators?: object,
  search?: string
}

@Injectable({
  providedIn: 'root'
})

export class TablesService {
  public tableName: string | null = null;

  private tables = new BehaviorSubject<string>('');
  public cast = this.tables.asObservable();

  constructor(
    private _http: HttpClient,
    private router: Router,
    private _notifications: NotificationsService,
    private angulartics2: Angulartics2,

  ) {
    this.router = router;

    this.router.events
			.pipe(
				filter(
					(event) : boolean => {
						return( event instanceof NavigationEnd );
					}
				)
			)
			.subscribe(
				( event: NavigationEnd ) : void => {
          this.setTableName(this.router.routerState.snapshot.root.firstChild.paramMap.get('table-name'));
				}
			)
		;
  }

  setTableName(tableName: string) {
    this.tableName = tableName;
  }

  get currentTableName() {
    return this.tableName;
  }

  fetchTables(connectionID: string, hidden?: boolean) {
    return this._http.get<any>(`/connection/tables/${connectionID}`, {
      params: {
        ...(hidden ? {hidden} : {}),
      }
    })
      .pipe(
        map(res => {
          return res;
        }),
      );
  }

  fetchTable({
    connectionID,
    tableName,
    requstedPage,
    chunkSize,
    sortColumn,
    sortOrder,
    foreignKeyRowName,
    foreignKeyRowValue,
    referencedColumn,
    filters,
    search
  }: TableParams) {
    let foreignKeyRowParamName = foreignKeyRowName === 'autocomplete' ? foreignKeyRowName : `f_${foreignKeyRowName}__eq`;

    if (tableName) {
      return this._http.post<any>(`/table/rows/find/${connectionID}`, { filters }, {
        params: {
          tableName,
          perPage: chunkSize.toString(),
          page: requstedPage.toString(),
          ...(search ? {search} : {}),
          ...(foreignKeyRowValue ? {[foreignKeyRowParamName]: foreignKeyRowValue} : {}),
          ...(referencedColumn ? {referencedColumn} : {}),
          ...(sortColumn ? {sort_by: sortColumn} : {}),
          ...(sortOrder ? {sort_order: sortOrder} : {}),
        }
      })
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          // this._notifications.showErrorSnackbar(err.error.message);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
    }
  }

  fetchTableStructure(connectionID: string, tableName: string) {
    return this._http.get<any>(`/table/structure/${connectionID}`, {
      params: {
        tableName
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

  fetchTableSettings(connectionID: string, tableName: string) {
    return this._http.get<any>('/settings', {
      params: {
        connectionId: connectionID,
        tableName
      }
    })
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  exportTableCSV({
    connectionID,
    tableName,
    chunkSize,
    sortColumn,
    sortOrder,
    filters,
    search,
  }) {
    return this._http.post<any>(`/table/csv/export/${connectionID}`, { filters }, {
      params: {
        perPage: chunkSize.toString(),
        page: '1',
        tableName,
        ...(search ? {search} : {}),
        ...(sortColumn ? {sort_by: sortColumn} : {}),
        ...(sortOrder ? {sort_order: sortOrder} : {}),
      },
      responseType: 'text' as 'json'
    })
      .pipe(
        map(res => {return res}),
        catchError((err) => {
          console.log(err);
          const errorObj = JSON.parse(err.error);
          this._notifications.showErrorSnackbar(errorObj.message);
          this.angulartics2.eventTrack.next({
            action: 'Dashboard: db export failed',
          });
          return EMPTY;
        })
      );
  }

  importTableCSV(connectionID: string, tableName: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this._http.post<any>(`/table/csv/import/${connectionID}`, formData, {
      params: {
        tableName
      }
    })
      .pipe(
        map(res => {
          this.tables.next('import');
          this._notifications.showSuccessSnackbar('CSV file has been imported successfully.');
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          this.angulartics2.eventTrack.next({
            action: 'Dashboard: db import failed',
          });
          return EMPTY;
        })
      );
  }

  updateTableSettings(isSettingsExist: boolean, connectionID: string, tableName: string, settings: TableSettings) {
    let method: string;
    if (isSettingsExist) {
      method = 'put'
    } else method = 'post';

    return this._http[method]<any>('/settings', settings, {
      params: {
        connectionId: connectionID,
        tableName
      }
    })
      .pipe(
        map(() => {
          this.tables.next('settings');
          this._notifications.showSuccessSnackbar('Table settings has been updated.')
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  deleteTableSettings(connectionID: string, tableName: string) {
    return this._http.delete<any>('/settings', {
      params: {
        connectionId: connectionID,
        tableName
      }
    })
      .pipe(
        map(() => {
          this.tables.next('settings');
          this._notifications.showSuccessSnackbar('Table settings has been reset.')
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  fetchTableWidgets(connectionID: string, tableName: string) {
    return this._http.get<any>(`/widgets/${connectionID}`, {
      params: {
        tableName
      }
    })
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  updateTableWidgets(connectionID: string, tableName: string, widgets: Widget[]) {
    return this._http.post<any>(`/widget/${connectionID}`, { widgets }, {
      params: {
        tableName
      }
    })
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar('Table widgets has been updated.')
          return res
        }),
        catchError((err) => {
          console.log(err);
          // this._notifications.showErrorSnackbar(err.error.message);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  bulkDelete(connectionID: string, tableName: string, primaryKeys) {
    return this._http.put<any>(`/table/rows/delete/${connectionID}`, primaryKeys, {
      params: {
        tableName
      }
    })
      .pipe(
        map(res => {
          this.tables.next('delete rows');
          this._notifications.showSuccessSnackbar('Rows have been deleted successfully.')
          return res
        }),
        catchError((err) => {
          console.log(err);
          // this._notifications.showErrorSnackbar(err.error.message);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  fetchRules(connectionID: string, tableName: string) {
    return this._http.get<any>(`/action/rules/${connectionID}`, {
      params: {
        tableName
      }
    })
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  saveRule(connectionID: string, tableName: string, rule: Rule) {
    return this._http.post<any>(`/action/rule/${connectionID}`, rule)
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar(`${res.title} action has been created.`);
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  updateRule(connectionID: string, tableName: string, rule: Rule) {
    return this._http.put<any>(`/action/rule/${rule.id}/${connectionID}`, rule)
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar(`${res.title} action has been updated.`);
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  deleteRule(connectionID: string, tableName: string, ruleId: string) {
    return this._http.delete<any>(`/action/rule/${ruleId}/${connectionID}`)
      .pipe(
        map(res => {
          this.tables.next('delete-rule');
          this._notifications.showSuccessSnackbar(`${res.title} action has been deleted.`);
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  activateActions(connectionID: string, tableName: string, actionId: string, actionTitle: string, primaryKeys: object[], confirmed?: boolean) {
    return this._http.post<any>(`/event/actions/activate/${actionId}/${connectionID}`, primaryKeys)
      .pipe(
        map((res) => {
          this.tables.next('activate actions');
          this._notifications.showSuccessSnackbar(`${actionTitle} is done for ${primaryKeys.length} rows.`);
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  createAIthread(connectionID, tableName, message) {
    return this._http.post<any>(`/ai/thread/${connectionID}`, {user_message: message}, {
      responseType: 'text' as 'json',
      observe: 'response',
      params: {
        tableName
      }
    })
      .pipe(
        map((res) => {
          const threadId = res.headers.get('x-openai-thread-id');
          this.angulartics2.eventTrack.next({
            action: 'AI: thread created'
          });
          const responseMessage = res.body as string;
          return {threadId, responseMessage}
        }),
        catchError((err) => {
          console.log(err);
          return throwError(() => new Error(err.error.message));
        })
      );
  }

  requestAImessage(connectionID: string, tableName: string, threadId: string, message: string) {
    return this._http.post<any>(`/ai/thread/message/${connectionID}/${threadId}`, {user_message: message}, {
      params: {
        tableName
      }
    })
      .pipe(
        map((res) => {
          return res
        }),
        catchError((err) => {
          console.log(err);
          return throwError(() => new Error(err.error.message));
        })
      );
  }
}
