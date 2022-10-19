import { ActivatedRoute, Router } from '@angular/router';
import { Alert, AlertActionType, AlertType } from 'src/app/models/alert';
import { Component, NgZone, OnInit } from '@angular/core';
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
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-connect-db',
  templateUrl: './connect-db.component.html',
  styleUrls: ['./connect-db.component.css']
})
export class ConnectDBComponent implements OnInit {

  public connectionID: string | null = null;
  public masterKey: string;
  public connectionToken: string | null = null;
  public submitting: boolean = false;
  public userOS = null;
  public otherOS = [];
  public warning: Alert = {
    id: 10000000,
    type: AlertType.Warning,
    message: null
  }
  // public errorAlert: Alert;

  public ports = {
    [DBtype.MySQL]: '3306',
    [DBtype.Postgres]: '5432',
    [DBtype.Oracle]: '1521',
    [DBtype.MSSQL]: '1433'
  }

  public osAgents = {
    Mac: 'https://github.com/Autoadmin-org/autoadmin-cli/releases/download/latest/autoadmin-cli-macos',
    Windows: 'https://github.com/Autoadmin-org/autoadmin-cli/releases/download/latest/autoadmin-cli-windows.exe',
    Linux: 'https://github.com/Autoadmin-org/autoadmin-cli/releases/download/latest/autoadmin-cli-linux'
  }

  constructor(
    private _connections: ConnectionsService,
    private ngZone: NgZone,
    public router: Router,
    private route: ActivatedRoute,
    public dialog: MatDialog,
    private _notifications: NotificationsService,
    public _user: UserService,
    private angulartics2: Angulartics2
  ) { }

  ngOnInit() {
    this.connectionID = this._connections.currentConnectionID;
    const currentMasterKey = localStorage.getItem(`${this.connectionID}__masterKey`);
    if (currentMasterKey) {this.masterKey = currentMasterKey};

    if (navigator.appVersion.indexOf("Win") != -1) this.userOS = "Windows";
    if (navigator.appVersion.indexOf("Mac") != -1) this.userOS = "Mac";
    if (navigator.appVersion.indexOf("Linux") != -1) this.userOS = "Linux";
    if (this.userOS === null) this.userOS = "Linux";

    this.otherOS = Object.keys(this.osAgents).filter(os => os !== this.userOS);

    if (!this.connectionID) {
      this._user.sendUserAction('CONNECTION_CREATION_NOT_FINISHED').subscribe();
      // @ts-ignore
      fbq('trackCustom', 'Add_connection');
    };
  }

  get db():Connection {
    return this._connections.currentConnection
  }

  get accessLevel():AccessLevel {
    return this._connections.currentConnectionAccessLevel
  }

  dbTypeChange() {
    this.db.port = this.ports[this.db.type];
  }

  testConnection() {
    this.submitting = true;
    this._connections.testConnection(this.connectionID, this.db)
      .subscribe(
        (credsCorrect: TestConnection) => {
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

  checkMasterPassword() {
    if (this.db.masterEncryption) {
      localStorage.setItem(`${this.connectionID}__masterKey`, this.masterKey);
    } else {
      localStorage.removeItem(`${this.connectionID}__masterKey`);
    }
  }

  createConnectionRequest() {
    this._connections.createConnection(this.db)
    .subscribe((res: any) => {
        this.ngZone.run(() => {
          this.connectionID = res.id!;
          if (this.db.connectionType === 'agent') {
            this.connectionToken = res.token;
          } else {
            this.router.navigate([`/dashboard/${this.connectionID}`]);
          };
          this.angulartics2.eventTrack.next({
            action: 'Connect DB: connection is added successfully'
          });
        });
      },
      () => {
        this.angulartics2.eventTrack.next({
          action: 'Connect DB: connection is added unsuccessfully'
        });
      },
      () => {this.submitting = false}
    )
  }

  updateConnectionRequest() {
    this._connections.updateConnection(this.db)
    .subscribe((res: any) => {
      this.ngZone.run(() => {
        this.checkMasterPassword();
        const connectionID = res.connection.id!;
        if (this.db.connectionType === 'agent') {
          this.connectionToken = res.connection.token;
        } else {
          this.router.navigate([`/dashboard/${connectionID}`]);
        };
      });
    }, undefined, () => {
      this.submitting = false;
    })
  }

  handleConnectionError(errorMessage: string) {
    this.dialog.open(DbConnectionConfirmDialogComponent, {
      width: '25em',
      data: {
        dbCreds: this.db,
        errorMessage
      }
    });
    this.submitting = false;
    //@ts-ignore
    // Intercom('show');
  }

  amplitudeTrackAddConnection(isCorrectCreds: boolean) {
    if (isCorrectCreds) {
      this.angulartics2.eventTrack.next({
        action: 'Connect DB: test connection is passed'
      });
    } else {
      this.angulartics2.eventTrack.next({
        action: 'Connect DB: test connection is failed'
      });
    }
  }

  async editConnection(connectForm: NgForm) {
    this.submitting = true;
    let credsCorrect: TestConnection;

    (credsCorrect as any) = await this._connections.testConnection(this.connectionID, this.db).toPromise();

    if ((this.db.connectionType === 'agent' || credsCorrect.result)) {
      this.updateConnectionRequest();
    } else {
      this.handleConnectionError(credsCorrect.message);
    };
  }

  createConnection(connectForm: NgForm) {
    if (connectForm.form.valid) {
      if (this.db.connectionType === 'direct') {
        const ipAddressDilaog = this.dialog.open(DbConnectionIpAccessDialogComponent, {
          width: '36em',
          data: this.db
        });

        ipAddressDilaog.afterClosed().subscribe( async (action) => {
          if (action === 'confirmed') {
            this.submitting = true;
            let credsCorrect: TestConnection;

            this.checkMasterPassword();

            (credsCorrect as any) = await this._connections.testConnection(this.connectionID, this.db).toPromise();
            this.amplitudeTrackAddConnection(credsCorrect.result);

            if (credsCorrect.result) {
              this.createConnectionRequest();
            } else {
              this.handleConnectionError(credsCorrect.message);
            }
          }
        })
      } else {
        this.createConnectionRequest();
      }
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

  generatePassword () {
    let randomArray = new Uint8Array(32);
    window.crypto.getRandomValues(randomArray);
    this.masterKey = btoa(String.fromCharCode(...randomArray));
  }

  showCopyNotification(message: string) {
    this._notifications.showSuccessSnackbar(message);

  }

  switchToAgent() {
    this.db.connectionType = ConnectionType.Agent;
  }
}
