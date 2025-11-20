import * as ipaddr from 'ipaddr.js';

import { Alert, AlertActionType, AlertType } from 'src/app/models/alert';
import { Angulartics2, Angulartics2Module } from 'angulartics2';
import { Component, NgZone, OnInit } from '@angular/core';
import { Connection, ConnectionType, DBtype, TestConnection } from 'src/app/models/connection';
import { Subscription, take } from 'rxjs';
import { supportedDatabasesTitles, supportedOrderedDatabases } from 'src/app/consts/databases';

import { AccessLevel } from 'src/app/models/user';
import { AlertComponent } from '../ui-components/alert/alert.component';
import { CassandraCredentialsFormComponent } from './db-credentials-forms/cassandra-credentials-form/cassandra-credentials-form.component';
import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { CompanyService } from 'src/app/services/company.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { Db2CredentialsFormComponent } from './db-credentials-forms/db2-credentials-form/db2-credentials-form.component';
import { DbConnectionConfirmDialogComponent } from './db-connection-confirm-dialog/db-connection-confirm-dialog.component';
import { DbConnectionDeleteDialogComponent } from './db-connection-delete-dialog/db-connection-delete-dialog.component';
import { DbConnectionIpAccessDialogComponent } from './db-connection-ip-access-dialog/db-connection-ip-access-dialog.component';
import { DynamodbCredentialsFormComponent } from './db-credentials-forms/dynamodb-credentials-form/dynamodb-credentials-form.component';
import { FormsModule } from '@angular/forms';
import { IpAddressButtonComponent } from '../ui-components/ip-address-button/ip-address-button.component';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MongodbCredentialsFormComponent } from './db-credentials-forms/mongodb-credentials-form/mongodb-credentials-form.component';
import { MssqlCredentialsFormComponent } from './db-credentials-forms/mssql-credentials-form/mssql-credentials-form.component';
import { MysqlCredentialsFormComponent } from './db-credentials-forms/mysql-credentials-form/mysql-credentials-form.component';
import { NgForm } from '@angular/forms';
import { NotificationsService } from 'src/app/services/notifications.service';
import { OracledbCredentialsFormComponent } from './db-credentials-forms/oracledb-credentials-form/oracledb-credentials-form.component';
import { PostgresCredentialsFormComponent } from './db-credentials-forms/postgres-credentials-form/postgres-credentials-form.component';
import { RedisCredentialsFormComponent } from './db-credentials-forms/redis-credentials-form/redis-credentials-form.component';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { UserService } from 'src/app/services/user.service';
import { environment } from 'src/environments/environment';
import googlIPsList from 'src/app/consts/google-IP-addresses';
import isIP from 'validator/lib/isIP';

@Component({
  selector: 'app-connect-db',
  templateUrl: './connect-db.component.html',
  styleUrls: ['./connect-db.component.css'],
  imports: [
    MatInputModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    CdkCopyToClipboard,
    RouterModule,
    FormsModule,
    CommonModule,
    MatDialogModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    Db2CredentialsFormComponent,
    DynamodbCredentialsFormComponent,
    CassandraCredentialsFormComponent,
    MongodbCredentialsFormComponent,
    MssqlCredentialsFormComponent,
    MysqlCredentialsFormComponent,
    OracledbCredentialsFormComponent,
    PostgresCredentialsFormComponent,
    RedisCredentialsFormComponent,
    IpAddressButtonComponent,
    AlertComponent,
    Angulartics2Module
  ]
})
export class ConnectDBComponent implements OnInit {

  public isSaas = (environment as any).saas;
  public connectionID: string | null = null;
  public masterKey: string;
  public connectionToken: string | null = null;
  public submitting: boolean = false;
  public otherOS = [];
  public warning: Alert = {
    id: 10000000,
    type: AlertType.Warning,
    message: null
  }

  public supportedOrderedDatabases = supportedOrderedDatabases;
  public supportedDatabasesTitles = supportedDatabasesTitles;
  public ports = {
    [DBtype.MySQL]: '3306',
    [DBtype.Postgres]: '5432',
    [DBtype.Oracle]: '1521',
    [DBtype.MSSQL]: '1433',
    [DBtype.Mongo]: '27017',
    [DBtype.Dynamo]: '',
    [DBtype.Cassandra]: '9042',
    [DBtype.Redis]: '6379',
    [DBtype.DB2]: '50000'
  }

  private getTitleSubscription: Subscription;

  // public isDemo: boolean = false;

  public isDemoConnectionWarning: Alert = {
    id: 10000000,
    type: AlertType.Warning,
    message: 'This is a DEMO SESSION! It will disappear after you log out. Don\'t use databases you\'re actively using or that contain information you wish to retain.'
  }

  constructor(
    private _connections: ConnectionsService,
    private _notifications: NotificationsService,
    public _user: UserService,
    private _company: CompanyService,
    private ngZone: NgZone,
    public router: Router,
    public dialog: MatDialog,
    private angulartics2: Angulartics2,
    private title: Title
  ) { }

  get isDemo() {
    return this._user.isDemo;
  }

  ngOnInit() {
    this.connectionID = this._connections.currentConnectionID;

    const databaseType = this.router.routerState.snapshot.root.queryParams.type;

    if (databaseType) {
      this.db.type = databaseType
      this.db.port = this.ports[databaseType];
    };

    this._connections.getCurrentConnectionTitle()
      .pipe(take(1))
      .subscribe(connectionTitle => {
        if (this.connectionID) {
          this.title.setTitle(`Credentials — ${connectionTitle} | ${this._company.companyTabTitle || 'Rocketadmin'}`);
        } else {
          this.title.setTitle(`Add new database | ${this._company.companyTabTitle || 'Rocketadmin'}`);
        }
      });

    if (!this.connectionID) {
      this._user.sendUserAction('CONNECTION_CREATION_NOT_FINISHED').subscribe();
      if (this.isSaas) {
        // @ts-ignore
        fbq('trackCustom', 'Add_connection');
      }
    };
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
            this._notifications.showSuccessSnackbar('Connection is live')
          } else {
            this._notifications.showAlert(AlertType.Error, credsCorrect.message, [
              {
                type: AlertActionType.Button,
                caption: 'Dismiss',
                action: (id: number) => this._notifications.dismissAlert()
              }
            ]);
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
      width: '32em',
      data: {
        dbCreds: this.db,
        provider: this.getProvider(),
        masterKey: this.masterKey,
        errorMessage
      }
    });
    this.submitting = false;
  }

  handleCredentialsSubmitting(connectForm: NgForm) {
    this.db.masterEncryption = !!this.masterKey;
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
    if (this.db.connectionType === 'direct') {
      if (this.db.type !== DBtype.Dynamo) {
        const ipAddressDilaog = this.dialog.open(DbConnectionIpAccessDialogComponent, {
          width: '36em',
          data: {
            db: this.db,
            provider: this.getProvider()
          }
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
        this.submitting = true;
        let credsCorrect: TestConnection = null;

        this._connections.testConnection(this.connectionID, this.db).toPromise()
          .then((res: TestConnection) => {
            credsCorrect = res;
            this.angulartics2.eventTrack.next({
              action: `Connect DB: automatic test connection on add is ${credsCorrect.result ? 'passed' : 'failed'}`,
              properties: {
                connectionType: this.db.connectionType,
                dbType: this.db.type,
                errorMessage: credsCorrect.message
              }
            });
            if (credsCorrect && credsCorrect.result) {
              this.createConnectionRequest();
            } else {
              this.handleConnectionError(credsCorrect.message);
            }
          })
          .catch((e) => {
            credsCorrect = null;
            this.submitting = false;
          });
      }

    } else {
      this.createConnectionRequest();
    }
  }

  confirmDeleteConnection(connectionCreds: any, event: Event): void {
    event.preventDefault();
    event.stopImmediatePropagation();
    this.dialog.open(DbConnectionDeleteDialogComponent, {
      width: '32em',
      data: connectionCreds
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
    console.log('switchToAgent');
    this.db.connectionType = ConnectionType.Agent;
  }

  handleMasterKeyChange(newMasterKey: string): void {
    this.masterKey = newMasterKey;
  }

  getProvider() {
    let provider: string = null;
    if (this.db.host.endsWith('.amazonaws.com')) provider = 'amazon';
    if (this.db.host.endsWith('.amazonaws.com') && this.db.type === DBtype.Dynamo) provider = 'amazonDynamoDB';
    if (this.db.host.endsWith('.azure.com')) provider = 'azure';
    if (this.db.host.endsWith('.mongodb.net')) provider = 'mongoatlas';
    if (this.db.host.endsWith('.ondigitalocean.com')) provider = 'digitalocean';
    if(isIP(this.db.host)) {
      const hostIP = ipaddr.parse(this.db.host);
      for (const addr of googlIPsList) {
        if (hostIP.match(ipaddr.parseCIDR(addr))) {
          provider = 'google';
          return;
        }
      }
    }
    return provider;
  }
}
