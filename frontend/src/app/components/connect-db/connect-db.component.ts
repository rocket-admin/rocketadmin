import { Alert, AlertActionType, AlertType } from 'src/app/models/alert';
import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Connection, ConnectionType, DBtype, TestConnection } from 'src/app/models/connection';

import { AccessLevel } from 'src/app/models/user';
import { Angulartics2 } from 'angulartics2';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DbConnectionConfirmDialogComponent } from './db-connection-confirm-dialog/db-connection-confirm-dialog.component';
import { DbConnectionDeleteDialogComponent } from './db-connection-delete-dialog/db-connection-delete-dialog.component';
import { DbConnectionIpAccessDialogComponent } from './db-connection-ip-access-dialog/db-connection-ip-access-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { NgForm } from '@angular/forms';
import { NotificationsService } from 'src/app/services/notifications.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { UserService } from 'src/app/services/user.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-connect-db',
  templateUrl: './connect-db.component.html',
  styleUrls: ['./connect-db.component.css']
})
export class ConnectDBComponent implements OnInit, OnDestroy {

  public isSaas = (environment as any).saas;
  public connectionID: string | null = null;
  public isMasterKeyTurnedOn: boolean = false;
  public masterKey: string;
  public connectionToken: string | null = null;
  public submitting: boolean = false;
  // public userOS = null;
  public otherOS = [];
  public warning: Alert = {
    id: 10000000,
    type: AlertType.Warning,
    message: null
  }

  public ports = {
    [DBtype.MySQL]: '3306',
    [DBtype.Postgres]: '5432',
    [DBtype.Oracle]: '1521',
    [DBtype.MSSQL]: '1433',
    [DBtype.Mongo]: '27017',
    [DBtype.Dynamo]: '',
    [DBtype.DB2]: '50000'
  }

  // public osAgents = {
  //   Mac: 'https://github.com/rocket-admin/rocketadmin-cli/releases/download/latest/rocketadmin-cli-macos',
  //   Windows: 'https://github.com/rocket-admin/rocketadmin-cli/releases/download/latest/rocketadmin-cli-windows.exe',
  //   Linux: 'https://github.com/rocket-admin/rocketadmin-cli/releases/download/latest/rocketadmin-cli-linux'
  // }

  private getTitleSubscription: Subscription;

  constructor(
    private _connections: ConnectionsService,
    private _notifications: NotificationsService,
    public _user: UserService,
    private ngZone: NgZone,
    public router: Router,
    public dialog: MatDialog,
    private angulartics2: Angulartics2,
    private title: Title
  ) { }

  ngOnInit() {
    this.connectionID = this._connections.currentConnectionID;
    this.isMasterKeyTurnedOn = this._connections.currentConnection.masterEncryption;

    if (this.connectionID) this.getTitleSubscription = this._connections.getCurrentConnectionTitle().subscribe(connectionTitle => {
      this.title.setTitle(`Edit connection ${connectionTitle} | Rocketadmin`);
    });

    // if (navigator.appVersion.indexOf("Win") != -1) this.userOS = "Windows";
    // if (navigator.appVersion.indexOf("Mac") != -1) this.userOS = "Mac";
    // if (navigator.appVersion.indexOf("Linux") != -1) this.userOS = "Linux";
    // if (this.userOS === null) this.userOS = "Linux";

    // this.otherOS = Object.keys(this.osAgents).filter(os => os !== this.userOS);

    if (!this.connectionID) {
      this._user.sendUserAction('CONNECTION_CREATION_NOT_FINISHED').subscribe();
      if (this.isSaas) {
        // @ts-ignore
        fbq('trackCustom', 'Add_connection');
      }
    };
  }

  ngOnDestroy() {
    if (this.connectionID && !this.connectionToken) this.getTitleSubscription.unsubscribe();
  }

  get db():Connection {
    return this._connections.currentConnection;
  }

  get accessLevel():AccessLevel {
    return this._connections.currentConnectionAccessLevel;
  }

  dbTypeChange() {
    this.db.port = this.ports[this.db.type];
  }

  testConnection() {
    this.submitting = true;
    this._connections.testConnection(this.connectionID, this.db)
      .subscribe(
        (credsCorrect: TestConnection) => {
          this.angulartics2.eventTrack.next({
            action: `Connect DB: manual test connection before ${this.db.id ? 'edit' : 'add'} is ${credsCorrect.result ? 'passed' : 'failed'}`,
            properties: { errorMessage: credsCorrect.message }
          });
          if (credsCorrect.result) {
            this._notifications.dismissAlert();
            this._notifications.showSuccessSnackbar('Connection exists. Your credentials are correct.')
          } else {
            this._notifications.showAlert(AlertType.Error, credsCorrect.message, [
              {
                type: AlertActionType.Button,
                caption: 'Dismiss',
                action: (id: number) => this._notifications.dismissAlert()
              }
            ]);
            //@ts-ignore
            // Intercom('show');
          };
        },
        () => {this.submitting = false},
        () => {this.submitting = false}
      );
  }

  createConnectionRequest() {
    this._connections.createConnection(this.db, this.masterKey)
    .subscribe((res: any) => {
        this.ngZone.run(() => {
          const createdConnectionID = res.id!;
          if (this.db.connectionType === 'agent') {
            this.connectionToken = res.token;
            this.connectionID = res.id;
          } else {
            this.router.navigate([`/dashboard/${createdConnectionID}`]);
          };
          this.angulartics2.eventTrack.next({
            action: 'Connect DB: connection is added successfully',
            properties: { connectionType: this.db.connectionType, dbType: this.db.type }
          });
        });
      },
      (errorMessage) => {
        this.angulartics2.eventTrack.next({
          action: 'Connect DB: connection is added unsuccessfully',
          properties: { connectionType: this.db.connectionType, dbType: this.db.type, errorMessage }
        });
        this.submitting = false;
      },
      () => {this.submitting = false}
    )
  }

  updateConnectionRequest() {
    this._connections.updateConnection(this.db, this.masterKey)
    .subscribe((res: any) => {
      this.ngZone.run(() => {
        const connectionID = res.connection.id!;
        if (this.db.connectionType === 'agent') {
          this.connectionToken = res.connection.token;
          this.angulartics2.eventTrack.next({
            action: 'Connect DB: connection is edited successfully',
            properties: { connectionType: 'agent' }
          });
        } else {
          this.angulartics2.eventTrack.next({
            action: 'Connect DB: connection is edited successfully',
            properties: { connectionType: 'direct' }
          });
          this.router.navigate([`/dashboard/${connectionID}`]);
        };
      });
    },
    (errorMessage) => {
      this.angulartics2.eventTrack.next({
        action: 'Connect DB: connection is edited unsuccessfully',
        properties: { errorMessage }
      });
      this.submitting = false;
    }, () => {
      this.submitting = false;
    })
  }

  handleConnectionError(errorMessage: string) {
    this.dialog.open(DbConnectionConfirmDialogComponent, {
      width: '25em',
      data: {
        dbCreds: this.db,
        masterKey: this.masterKey,
        errorMessage
      }
    });
    this.submitting = false;
    //@ts-ignore
    // Intercom('show');
  }

  handleCredentialsSubmitting(connectForm: NgForm) {
    this.db.masterEncryption = this.isMasterKeyTurnedOn;
    if (this.db.id) {
      this.editConnection();
    } else {
      this.createConnection(connectForm);
    }
  }

  async editConnection() {
    this.submitting = true;
    let credsCorrect: TestConnection;

    (credsCorrect as any) = await this._connections.testConnection(this.connectionID, this.db).toPromise();

    this.angulartics2.eventTrack.next({
      action: `Connect DB: automatic test connection on edit is ${credsCorrect.result ? 'passed' : 'failed'}`,
      properties: { errorMessage: credsCorrect.message }
    });

    if ((this.db.connectionType === 'agent' || credsCorrect.result)) {
      this.updateConnectionRequest();
    } else {
      this.handleConnectionError(credsCorrect.message);
    };
  }

  createConnection(connectForm: NgForm) {
    // if (connectForm.form.vald) {

    // }
    if (this.db.connectionType === 'direct') {
      const ipAddressDilaog = this.dialog.open(DbConnectionIpAccessDialogComponent, {
        width: '36em',
        data: this.db
      });

      ipAddressDilaog.afterClosed().subscribe( async (action) => {
        if (action === 'confirmed') {
          this.submitting = true;
          let credsCorrect: TestConnection = null;

          try {
            (credsCorrect as any) = await this._connections.testConnection(this.connectionID, this.db).toPromise();

            this.angulartics2.eventTrack.next({
              action: `Connect DB: automatic test connection on add is ${credsCorrect.result ? 'passed' : 'failed'}`,
              properties: { connectionType: this.db.connectionType, dbType: this.db.type, errorMessage: credsCorrect.message }
            });

            if (credsCorrect && credsCorrect.result) {
              this.createConnectionRequest();
            } else {
              this.handleConnectionError(credsCorrect.message);
            };
          } catch (e) {
            credsCorrect = null;
            this.submitting = false;
          }
        }
      })
    } else {
      this.createConnectionRequest();
    }
  }

  confirmDeleteConnection (connection: Connection) {
    event.preventDefault();
    event.stopImmediatePropagation();
    this.dialog.open(DbConnectionDeleteDialogComponent, {
      width: '32em',
      data: connection
    });
  }

  generatePassword (checked: boolean) {
    if (checked) {
      let randomArray = new Uint8Array(32);
      window.crypto.getRandomValues(randomArray);
      this.masterKey = btoa(String.fromCharCode(...randomArray));
    }
  }

  showCopyNotification(message: string) {
    this._notifications.showSuccessSnackbar(message);
  }

  switchToAgent() {
    this.db.connectionType = ConnectionType.Agent;
  }

  handleMasterKeyChange(newMasterKey: string): void {
    this.masterKey = newMasterKey;
  }

  handleMasterKeyToggle(isTurnedOn: boolean): void {
    this.isMasterKeyTurnedOn = isTurnedOn;
  }
}
