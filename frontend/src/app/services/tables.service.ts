import { AlertActionType, AlertType } from '../models/alert';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { NavigationEnd, Router, RouterEvent } from '@angular/router';
import { TableSettings, Widget } from '../models/table';
import { catchError, filter, map } from 'rxjs/operators';

import { HttpClient } from '@angular/common/http';
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
  comparators?: object
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
    private _notifications: NotificationsService
  ) {
    this.router = router;

    this.router.events
			.pipe(
				filter(
					( event: RouterEvent ) : boolean => {
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
    console.log('fetchTables service');
    return this._http.get<any>(`/connection/tables/${connectionID}`, {
      params: {
        ...(hidden ? {hidden} : {}),
      }
    })
      .pipe(
        map(res => {
          console.log('fetchTables response');
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
    filters, comparators
  }: TableParams) {
    const foreignKeyRowParamName = foreignKeyRowName === 'autocomplete' ? foreignKeyRowName : `f_${foreignKeyRowName}__eq`;
    let filterParams = {}
    if (filters && comparators) {
      Object.keys(filters).forEach(
        key => {
          filterParams[`f_${key}__${comparators[key]}`] = filters[key];
      })
    }

    if (tableName) {
      return this._http.get<any>(`/table/rows/${connectionID}`, {
        params: {
          tableName,
          perPage: chunkSize.toString(),
          page: requstedPage.toString(),
          ...(foreignKeyRowValue ? {[foreignKeyRowParamName]: foreignKeyRowValue} : {}),
          ...(referencedColumn ? {referencedColumn} : {}),
          ...(sortColumn ? {sort_by: sortColumn} : {}),
          ...(sortOrder ? {sort_order: sortOrder} : {}),
          ...(filterParams ? filterParams : {})
        }
      })
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          // this._notifications.showErrorSnackbar(err.error.message);
          this._notifications.showAlert(AlertType.Error, err.error.message, [
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
          this._notifications.showAlert(AlertType.Error, err.error.message, [
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
          this._notifications.showAlert(AlertType.Error, err.error.message, [
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
          this._notifications.showAlert(AlertType.Error, err.error.message, [
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
          this._notifications.showAlert(AlertType.Error, err.error.message, [
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
          this._notifications.showAlert(AlertType.Error, err.error.message, [
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
