import { AlertActionType, AlertType } from '../models/alert';
import { BehaviorSubject, EMPTY, throwError } from 'rxjs';
import { Connection, ConnectionSettings, ConnectionType, DBtype } from '../models/connection';
import { IColorConfig, NgxThemeService } from '@brumeilde/ngx-theme';
import { NavigationEnd, ResolveEnd, Router, RouterEvent } from '@angular/router';
import { catchError, filter, map } from 'rxjs/operators';

import { AccessLevel } from '../models/user';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MasterPasswordService } from './master-password.service';
import { NotificationsService } from './notifications.service';

interface LogParams {
  connectionID: string,
  tableName?: string,
  userEmail?: string,
  requstedPage?: number,
  chunkSize?: number,
}

type Palettes = { primaryPalette: string, accentedPalette: string };
type Colors = { myColorName: string };

@Injectable({
  providedIn: 'root'
})
export class ConnectionsService {
  public connectionID: string | null = null;
  public connectionInitialState: Connection = Object.freeze({
    id: null,
    type: DBtype.MySQL,
    host: '',
    port: '3306',
    sid: '',
    username: '',
    password: '',
    database: '',
    title: '',
    ssh: false,
    privateSSHKey: '',
    sshHost: '',
    sshPort: '',
    sshUsername: '',
    ssl: false,
    cert: '',
    masterEncryption: false,
    azure_encryption: false,
    connectionType: ConnectionType.Direct,
    signing_key: null
  });
  public connection: Connection;
  public connectionAccessLevel: AccessLevel;
  public groupsAccessLevel: boolean;
  public currentPage: string;
  public connectionLogo: string;
  public companyName: string;

  private connectionNameSubject: BehaviorSubject<string> = new BehaviorSubject<string>('Rocketadmin');

  constructor(
    private _http: HttpClient,
    private router: Router,
    private _notifications: NotificationsService,
    private _masterPasswordRequest: MasterPasswordService,
    private _themeService: NgxThemeService<IColorConfig<Palettes, Colors>>
  ) {
    this.connection = {...this.connectionInitialState};
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
          const urlConnectionID = this.router.routerState.snapshot.root.firstChild.paramMap.get('connection-id');
          this.currentPage = this.router.routerState.snapshot.root.firstChild.url[0].path;
          this.setConnectionID(urlConnectionID);
          this.setConnectionInfo(urlConnectionID);
          this._notifications.resetAlert();
				}
			)
    ;
  }

  get currentConnectionID() {
    return this.connectionID;
  }

  get logo() {
    return this.connectionLogo;
  }

  get name() {
    return this.companyName;
  }

  get currentConnection() {
    return this.connection;
  }

  get currentConnectionAccessLevel() {
    return this.connectionAccessLevel;
  }

  get currentConnectionGroupAccessLevel() {
    return this.groupsAccessLevel;
  }

  get currentTab() {
    return this.currentPage;
  }

  get visibleTabs() {
    let tabs = ['dashboard', 'audit'];
    if (this.groupsAccessLevel) tabs.push('users');
    if (this.isPermitted(this.connectionAccessLevel)) tabs.push('edit-db', 'connection-settings');
    return tabs;
  }

  getCurrentConnectionTitle() {
    return this.connectionNameSubject.asObservable();
  }

  setConnectionID(id: string) {
    this.connectionID = id;
  }

  setConnectionInfo(id: string) {
    console.log('setConnectionInfo');
    console.log(id);
    if (id) {
      this.fetchConnection(id).subscribe(res => {
        this.connection = res.connection;
        this.connectionAccessLevel = res.accessLevel;
        this.groupsAccessLevel = res.groupManagement;
        this.connectionNameSubject.next(res.connection.title || res.connection.database);
        if (res.connectionProperties) {
          console.log('setConnectionInfo ui');
          this.connectionLogo = res.connectionProperties.logo_url;
          this.companyName = res.connectionProperties.company_name;
          this._themeService.updateColors({ palettes: { primaryPalette: res.primary_color, accentedPalette: res.secondary_color }});
        } else {
          this.connectionLogo = null;
          this.companyName = null;
          this._themeService.updateColors({ palettes: { primaryPalette: '#3258f0', accentedPalette: '#ed4870' }});
        }
      });
    } else {
      this.connection = {...this.connectionInitialState};
      this.connectionLogo = null;
      this.companyName = null;
      this._themeService.updateColors({ palettes: { primaryPalette: '#3258f0', accentedPalette: '#ed4870' }});
    }
  }

  isPermitted(accessLevel: AccessLevel) {
    return accessLevel === 'edit' || accessLevel === 'readonly'
  }

  defineConnecrionType(connection) {
    if (connection.type && connection.type.startsWith('agent_')) {
      connection.type = connection.type.slice(6);
      connection.connectionType = ConnectionType.Agent;
    } else {
      connection.connectionType = ConnectionType.Direct;
    }
    return connection;
  }

  fetchConnections() {
    return this._http.get<any>('/connections')
      .pipe(
        map(res => {
          const connections = res.connections.map(connectionItem => {
            const connection = this.defineConnecrionType(connectionItem.connection);
            return {...connectionItem, connection};
          })
          return {... res, connections};
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

  fetchConnection(id: string) {
    return this._http.get<any>(`/connection/one/${id}`)
      .pipe(
        map(res => {
          const connection = this.defineConnecrionType(res.connection);
          if (res.connectionProperties) {
            this.connectionLogo = res.connectionProperties.logo_url;
            this.companyName = res.connectionProperties.company_name;
            this._themeService.updateColors({ palettes: { primaryPalette: res.connectionProperties.primary_color, accentedPalette: res.connectionProperties.secondary_color }});
          }
          return {...res, connection};
        }),
        catchError((err) => {
          console.log(err);
          if (err.error.type === 'no_master_key' && this.router.url !== '/connections-list') {
            this._masterPasswordRequest.showMasterPasswordDialog()
          };
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        }
        )
      );
  }

  testConnection(connectionID: string, connection: Connection) {
    let dbCredentials;
    dbCredentials = {
      ...connection,
      port: parseInt(connection.port, 10),
      sshPort: parseInt(connection.sshPort, 10)
    };

    if (connection.connectionType === 'agent') {
      dbCredentials.type = `agent_${dbCredentials.type}`
    }

    return this._http.post(`/connection/test`, dbCredentials,
      {params: {
        ...(connectionID ? {connectionId: connectionID} : {})
      }})
    .pipe(
      map(res => res),
      catchError((err) => {
        console.log(err);
        this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, []);
        return EMPTY;
      }
      )
    );
  }

  createConnection(connection: Connection) {
    let dbCredentials;
    dbCredentials = {
      ...connection,
      port: parseInt(connection.port, 10),
      sshPort: parseInt(connection.sshPort, 10)
    };

    if (connection.connectionType === 'agent') {
      dbCredentials.type = `agent_${dbCredentials.type}`
    }

    return this._http.post('/connection', dbCredentials)
    .pipe(
      map(res => {
        this._notifications.showSuccessSnackbar('Connection was added successfully.');
        return res;
      }),
      catchError((err) => {
        console.log(err);
        this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, []);
        return throwError(() => new Error(err.error.message));
      }
      )
    );
  }

  updateConnection(connection: Connection) {
    let dbCredentials;
    dbCredentials = {
      ...connection,
      port: parseInt(connection.port, 10),
      sshPort: parseInt(connection.sshPort, 10)
    };

    if (connection.connectionType === 'agent') {
      dbCredentials.type = `agent_${dbCredentials.type}`
    }

    return this._http.put(`/connection/${connection.id}`, dbCredentials)
    .pipe(
      map(res => {
        this._notifications.showSuccessSnackbar('Connection has been updated successfully.');
        return res;
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
        // this._notifications.showErrorSnackbar(`${err.error.message}. Connection has not been updated.`);
        console.log('updateConnection catchError');
        return throwError(() => new Error(err.error.message));
      }
      )
    );
  }

  deleteConnection(id: string, metadata) {
    return this._http.put(`/connection/delete/${id}`, metadata)
    .pipe(
      map(() => {
        this._notifications.showSuccessSnackbar('Connection has been deleted successfully.');
      }),
      catchError((err) => {
        console.log(err);
        this._notifications.showErrorSnackbar(err.error.message);
        return EMPTY;
      }
      )
    );
  }

  fetchAuditLog({connectionID, tableName, userEmail, requstedPage, chunkSize}: LogParams) {
    if (tableName === "showAll") tableName = null;
    if (userEmail === "showAll") userEmail = null;
    return this._http.get(`/logs/${connectionID}`, {
      params: {
        page: requstedPage.toString(),
        perPage: chunkSize.toString(),
        ...(tableName ? {tableName} : {}),
        ...(userEmail ? {email: userEmail} : {}),
      }
    })
    .pipe(
      map(res => res),
      catchError((err) => {
        console.log(err);
        this._notifications.showErrorSnackbar(err.error.message);
        return EMPTY;
      }
      )
    );
  }

  getConnectionSettings(connectionID: string) {
    return this._http.get(`/connection/properties/${connectionID}`)
    .pipe(
      map((res: any) => {
        if (res) {
          this.connectionLogo = res.logo_url;
          this.companyName = res.company_name;
          this._themeService.updateColors({ palettes: { primaryPalette: res.primary_color, accentedPalette: res.secondary_color }});
        }
        return res;
      }),
      catchError((err) => {
        console.log(err);
        this._notifications.showErrorSnackbar(`${err.error.message}.`);
        return EMPTY;
      }
      )
    );
  }

  createConnectionSettings(connectionID: string, settings: ConnectionSettings) {
    return this._http.post(`/connection/properties/${connectionID}`, settings)
    .pipe(
      map(res => {
        this._notifications.showSuccessSnackbar('Connection settings has been created successfully.');
        return res;
      }),
      catchError((err) => {
        console.log(err);
        this._notifications.showErrorSnackbar(`${err.error.message}.`);
        return EMPTY;
      }
      )
    );
  }

  updateConnectionSettings(connectionID: string, settings: ConnectionSettings) {
    return this._http.put(`/connection/properties/${connectionID}`, settings)
    .pipe(
      map(res => {
        this._notifications.showSuccessSnackbar('Connection settings has been updated successfully.');
        return res;
      }),
      catchError((err) => {
        console.log(err);
        this._notifications.showErrorSnackbar(`${err.error.message}.`);
        return EMPTY;
      }
      )
    );
  }

  deleteConnectionSettings(connectionID: string) {
    return this._http.delete(`/connection/properties/${connectionID}`)
    .pipe(
      map(() => {
        this._notifications.showSuccessSnackbar('Connection settings has been removed successfully.');
      }),
      catchError((err) => {
        console.log(err);
        this._notifications.showErrorSnackbar(`${err.error.message}.`);
        return EMPTY;
      }
      )
    );
  }
}
