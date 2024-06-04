import { AlertActionType, AlertType } from '../models/alert';
import { BehaviorSubject, EMPTY, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NotificationsService } from './notifications.service';

@Injectable({
  providedIn: 'root'
})
export class TableRowService {
  private row;
  public cast;

  constructor(
    private _http: HttpClient,
    private _notifications: NotificationsService
  ) {
    this.row = new Subject<string>();
    this.cast = this.row.asObservable();
  }

  fetchTableRow(connectionID: string, tableName: string, params) {
    return this._http.get<any>(`/table/row/${connectionID}`, {
      params: {
        ...params,
        tableName
      }
    })
      .pipe(
        map(res => res),
        // catchError((err) => {
        //   console.log(err);
        //   this._notifications.showErrorSnackbar(err.error.message);
        //   return EMPTY;
        // })
      );
  }

  addTableRow(connectionID: string, tableName: string, row) {
    return this._http.post<any>(`/table/row/${connectionID}`, row, {
      params: {
        tableName
      }
    })
      .pipe(
        map((res) => {
          this._notifications.showSuccessSnackbar(`The row has been added successfully to "${tableName}" table.`);
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

  updateTableRow(connectionID: string, tableName: string, params, tableRow) {
    return this._http.put<any>(`/table/row/${connectionID}`, tableRow  , {
      params: {
        ...params,
        tableName
      }
    })
      .pipe(
        map((res) => {
          this._notifications.showSuccessSnackbar(`The row has been updated successfully in "${tableName}" table.`);
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details:err.error.originalMessage}, [
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

  deleteTableRow(connectionID: string, tableName: string, params: object) {
    return this._http.delete<any>(`/table/row/${connectionID}`, {
      params: {
        ...params,
        tableName
      }
    })
      .pipe(
        map(() => {
          this.row.next('delete row');
          this._notifications.showSuccessSnackbar(`Row has been deleted successfully from "${tableName}" table.`);
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  }
}
