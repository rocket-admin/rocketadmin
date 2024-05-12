import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NotificationsService } from './notifications.service';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ConnectionSettingsUI, GlobalSettingsUI, UiSettings } from '../models/ui-settings';

@Injectable({
  providedIn: 'root'
})
export class UiSettingsService {
  public settings: UiSettings = {
    globalSettings: {} as GlobalSettingsUI,
    connections: {} as { [connectionId: string]: ConnectionSettingsUI }
  }

  private uiSettings = new BehaviorSubject<any>(this.settings);
  public cast = this.uiSettings.asObservable();

  constructor(
    private _http: HttpClient,
    private _notifications: NotificationsService,
  ) { }

  get uiSettings$(){
    return this.uiSettings.asObservable();
  }

  updateGlobalSetting(key: string, value: any) {
    this.settings.globalSettings[key] = value;
    this.syncUiSettings().subscribe();
  }

  updateConnectionSetting(connectionId: string, key: string, value: any) {
    if (!this.settings.connections[connectionId]) {
      this.settings.connections[connectionId] = { shownTableTitles: false, tables: {} };
    }
    this.settings.connections[connectionId][key] = value;
    this.syncUiSettings().subscribe();
  }

  updateTableSetting(connectionId: string, tableName: string, key: string, value: any) {
    console.log('updateTableSetting')
    if (!this.settings.connections[connectionId]) {
      this.settings.connections[connectionId] = { shownTableTitles: false, tables: {} };
    }
    if (!this.settings.connections[connectionId].tables[tableName]) {
      this.settings.connections[connectionId].tables[tableName] = { shownColumns: [] };
    }
    this.settings.connections[connectionId].tables[tableName][key] = value;
    this.syncUiSettings().subscribe();
  }

  getUiSettings() {
    return this._http.get<any>('/user/settings')
      .pipe(
        map(res => {
          const settings = res.userSettings ? JSON.parse(res.userSettings) : null;
          console.log('getUiSettings settings')
          console.log(settings)
          this.uiSettings.next(settings);
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  };

  syncUiSettings() {
    return this._http.post<any>('/user/settings', {userSettings: JSON.stringify(this.settings)})
      .pipe(
        map(res => {
          const settings = res.userSettings ? JSON.parse(res.userSettings) : null;
          this.uiSettings.next(settings);
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  };
}

// {
//   "globalSettings": {
//     "connectionsListCollapsed": false
//   },
//   "connections": {
//     "[connection-id]": {
//       "shownTableTitles": false,
//       "tables": {
//         "[table-name]": {
//           "shownColumns": ["column1", "column2", "column3"]
//         }
//       }
//     }
//   }
// }

