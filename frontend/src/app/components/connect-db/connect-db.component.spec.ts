import { AlertActionType, AlertType } from 'src/app/models/alert';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConnectionType, DBtype } from 'src/app/models/connection';
import { FormsModule, NG_VALUE_ACCESSOR }   from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { Angulartics2Module } from 'angulartics2';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ConnectDBComponent } from './connect-db.component';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DbConnectionConfirmDialogComponent } from './db-connection-confirm-dialog/db-connection-confirm-dialog.component';
import { DbConnectionDeleteDialogComponent } from './db-connection-delete-dialog/db-connection-delete-dialog.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationsService } from 'src/app/services/notifications.service';
import { RouterTestingModule } from "@angular/router/testing";
import { forwardRef } from '@angular/core';
import { of } from 'rxjs';

describe('ConnectDBComponent', () => {
  let component: ConnectDBComponent;
  let fixture: ComponentFixture<ConnectDBComponent>;
  let dialog: MatDialog;

  let fakeNotifications = jasmine.createSpyObj('NotificationsService', ['showErrorSnackbar', 'showSuccessSnackbar', 'showAlert', 'dismissAlert']);
  let fakeConnectionsService = jasmine.createSpyObj('ConnectionsService', [
    'currentConnection', 'currentConnectionAccessLevel', 'testConnection',
    'createConnection', 'updateConnection', 'getCurrentConnectionTitle'
  ], {currentConnectionID: '9d5f6d0f-9516-4598-91c4-e4fe6330b4d4'});

  const connectionCredsApp = {
    "title": "Test connection via SSH tunnel to mySQL",
    "masterEncryption": false,
    "type": DBtype.MySQL,
    "host": "database-2.cvfuxe8nltiq.us-east-2.rds.amazonaws.com",
    "port": "3306",
    "username": "admin",
    "database": "testDB",
    "schema": null,
    "sid": null,
    "id": "9d5f6d0f-9516-4598-91c4-e4fe6330b4d4",
    "ssh": true,
    "sshHost": "3.134.99.192",
    "sshPort": '22',
    "sshUsername": "ubuntu",
    "ssl": false,
    "cert": null,
    "connectionType": ConnectionType.Direct,
    "azure_encryption": false,
    "signing_key": ''
  }

  beforeEach(async() => {
    await TestBed.configureTestingModule({
    imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        FormsModule,
        MatSelectModule,
        MatRadioModule,
        MatInputModule,
        MatDialogModule,
        BrowserAnimationsModule,
        Angulartics2Module.forRoot({}),
        ConnectDBComponent
    ],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => ConnectDBComponent),
            multi: true
        },
        { provide: NotificationsService, useValue: fakeNotifications },
        { provide: ConnectionsService, useValue: fakeConnectionsService },
    ]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConnectDBComponent);
    component = fixture.componentInstance;
    dialog = TestBed.get(MatDialog);

    // @ts-ignore
    global.window.fbq = jasmine.createSpy();
    // @ts-ignore
    global.window.Intercom = jasmine.createSpy();

    fakeConnectionsService.currentConnection.and.returnValue(connectionCredsApp);
    fakeConnectionsService.getCurrentConnectionTitle.and.returnValue(of('Test connection via SSH tunnel to mySQL'));
    // fakeConnectionsService.currentConnectionAccessLevel.and.returnValue('edit');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show Success snackbar if test passes successfully', () => {
    fakeConnectionsService.testConnection.and.returnValue(of({
      result: true
    }));

    component.testConnection();
    expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('Connection exists. Your credentials are correct.')

    fakeNotifications.showSuccessSnackbar.calls.reset();
  });

  it('should show Error alert if test passes unsuccessfully', () => {
    fakeConnectionsService.testConnection.and.returnValue(of({
      result: false,
      message: 'Error in hostname.'
    }));

    component.testConnection();
    expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, 'Error in hostname.', [jasmine.objectContaining({
      type: AlertActionType.Button,
      caption: 'Dismiss',
    })]);

    fakeNotifications.showAlert.calls.reset();
  });

  it('should set 1521 port for Oracle db type', () => {
    component.db.type = DBtype.Oracle;
    component.dbTypeChange();

    expect(component.db.port).toEqual('1521');
  });

  it('should show Copy message', () => {
    component.showCopyNotification('Connection token was copied to clipboard.');
    expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('Connection token was copied to clipboard.')

    fakeNotifications.showSuccessSnackbar.calls.reset();
  });

  it('should generate password if toggle is enabled', () => {
    component.generatePassword(true);
    expect(component.masterKey).toBeDefined();
  });

  it('should open delete connection dialog', () => {
    const fakeDialogOpen = spyOn(dialog, 'open');
    const event = jasmine.createSpyObj('event', [ 'preventDefault', 'stopImmediatePropagation' ]);

    component.confirmDeleteConnection(connectionCredsApp, event);
    expect(fakeDialogOpen).toHaveBeenCalledOnceWith(DbConnectionDeleteDialogComponent, {
      width: '32em',
      data: connectionCredsApp
    });
  });

  it('should create direct connection', () => {
    fakeConnectionsService.createConnection.and.returnValue(of(connectionCredsApp));
    spyOnProperty(component, "db", "get").and.returnValue(connectionCredsApp);
    component.createConnectionRequest();

    expect(component.connectionID).toEqual('9d5f6d0f-9516-4598-91c4-e4fe6330b4d4');
  })

  it('should create agent connection and set token', () => {
    const dbApp = {
      id: null,
      title: "Agent connection",
      type: DBtype.Oracle,
      port: '5432',
      connectionType: ConnectionType.Agent
    } as any;

    const dbRes = {
      id: "9d5f6d0f-9516-4598-91c4-e4fe6330b4d4",
      title: "Agent connection",
      type: 'agent_oracle',
      port: 5432,
      token: '1234-abcd-0987'
    };

    fakeConnectionsService.createConnection.and.returnValue(of(dbRes));
    spyOnProperty(component, "db", "get").and.returnValue(dbApp);
    component.createConnectionRequest();

    expect(component.connectionID).toEqual('9d5f6d0f-9516-4598-91c4-e4fe6330b4d4');
    expect(component.connectionToken).toEqual('1234-abcd-0987');
  })

  xit('should update direct connection', () => {
    fakeConnectionsService.updateConnection.and.returnValue(of(connectionCredsApp));
    spyOnProperty(component, "db", "get").and.returnValue(connectionCredsApp);
    component.updateConnectionRequest();

    // expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard/9d5f6d0f-9516-4598-91c4-e4fe6330b4d4']);
  })

  it('should update agent connection and set token', () => {
    const dbApp = {
      id: null,
      title: "Agent connection",
      type: DBtype.Oracle,
      port: '5432',
      connectionType: ConnectionType.Agent
    } as any;

    const dbRes = {
      connection: {
        id: "9d5f6d0f-9516-4598-91c4-e4fe6330b4d4",
        title: "Agent connection",
        type: 'agent_oracle',
        port: 5432,
        token: '1234-abcd-0987'
      }
    };

    fakeConnectionsService.updateConnection.and.returnValue(of(dbRes));
    spyOnProperty(component, "db", "get").and.returnValue(dbApp);
    component.updateConnectionRequest();

    expect(component.connectionToken).toEqual('1234-abcd-0987');
  })

  it('should open dialog on test error', () => {
    const fakeDialogOpen = spyOn(dialog, 'open');
    spyOnProperty(component, "db", "get").and.returnValue(connectionCredsApp);
    component.masterKey = "master_password_12345678"
    component.handleConnectionError('Hostname is invalid');

    expect(fakeDialogOpen).toHaveBeenCalledOnceWith(DbConnectionConfirmDialogComponent, {
      width: '25em',
      data: {
        dbCreds: connectionCredsApp,
        masterKey: 'master_password_12345678',
        errorMessage: 'Hostname is invalid'
      }
    });
  })
});
