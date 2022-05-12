import { BehaviorSubject, EMPTY } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NotificationsService } from './notifications.service';
import { BannerActionType, BannerType } from '../models/banner';

@Injectable({
  providedIn: 'root'
})
export class TableRowService {

  _tableURL = 'https://api-v2.autoadmin.org/table';

  private row = new BehaviorSubject<string>('');
  public cast = this.row.asObservable();

  constructor(
    private _http: HttpClient,
    private _notifications: NotificationsService
  ) { }

  fetchTableRow(connectionID: string, tableName: string, params) {
    return this._http.get<any>(`${this._tableURL}/row/${connectionID}`, {
      params: {
        ...params,
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

  addTableRow(connectionID: string, tableName: string, row) {
    return this._http.post<any>(`${this._tableURL}/row/${connectionID}`, row, {
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
          this._notifications.showBanner(BannerType.Error, err.error.message, [
            {
              type: BannerActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissBanner()
            }
          ]);
          return EMPTY;
        })
      );
  }

  updateTableRow(connectionID: string, tableName: string, params, tableRow) {
    return this._http.put<any>(`${this._tableURL}/row/${connectionID}`, tableRow  , {
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
          this._notifications.showBanner(BannerType.Error, err.error.message, [
            {
              type: BannerActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissBanner()
            }
          ]);
          return EMPTY;
        })
      );
  }

  deleteTableRow(connectionID: string, tableName: string, params) {
    return this._http.delete<any>(`${this._tableURL}/row/${connectionID}`, {
      params: {
        ...params,
        tableName
      }
    })
      .pipe(
        map(() => {
          this.row.next('');
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
