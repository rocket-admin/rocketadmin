import { BannerActionType, BannerType } from 'src/app/models/banner';
import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { ConnectionType, DBtype } from 'src/app/models/connection';
import { FormsModule, NG_VALUE_ACCESSOR }   from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { Angulartics2Module } from 'angulartics2';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ConnectDBComponent } from './connect-db.component';
import { ConnectionsService } from 'src/app/services/connections.service';
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
import { DbConnectionConfirmDialogComponent } from './db-connection-confirm-dialog/db-connection-confirm-dialog.component';

describe('ConnectDBComponent', () => {
  let component: ConnectDBComponent;
  let fixture: ComponentFixture<ConnectDBComponent>;
  let dialog: MatDialog;
  let mockLocalStorage;

  let fakeNotifications = jasmine.createSpyObj('NotificationsService', ['showErrorSnackbar', 'showSuccessSnackbar', 'showBanner', 'dismissBanner']);
  let fakeConnectionsService = jasmine.createSpyObj('ConnectionsService', [
    'currentConnection', 'currentConnectionAccessLevel', 'testConnection',
    'createConnection', 'updateConnection'
  ]);

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
    "azure_encryption": false
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
        Angulartics2Module.forRoot({})
      ],
      declarations: [ ConnectDBComponent ],
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

    let store = {};
    mockLocalStorage = {
      getItem: (key: string): string => {
        return key in store ? store[key] : null;
      },
      setItem: (key: string, value: string) => {
        store[key] = `${value}`;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      }
    };

      // @ts-ignore
      global.window.fbq = jasmine.createSpy();
      // @ts-ignore
      global.window.customerly = {open: jasmine.createSpy()};

    fakeConnectionsService.currentConnection.and.returnValue(connectionCredsApp);
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

  it('should show Error banner if test passes unsuccessfully', () => {
    fakeConnectionsService.testConnection.and.returnValue(of({
      result: false,
      message: 'Error in hostname.'
    }));

    component.testConnection();
    expect(fakeNotifications.showBanner).toHaveBeenCalledWith(BannerType.Error, 'Error in hostname.', [jasmine.objectContaining({
      type: BannerActionType.Button,
      caption: 'Dismiss',
    })]);

    fakeNotifications.showBanner.calls.reset();
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

  it('should generate password', () => {
    component.generatePassword();
    expect(component.masterKey).toBeDefined();
  });

  it('should open delete connection dialog', () => {
    const fakeDialogOpen = spyOn(dialog, 'open');
    event = jasmine.createSpyObj('event', [ 'preventDefault', 'stopImmediatePropagation' ]);

    component.confirmDeleteConnection(connectionCredsApp);
    expect(fakeDialogOpen).toHaveBeenCalledOnceWith(DbConnectionDeleteDialogComponent, {
      width: '32em',
      data: connectionCredsApp
    });
  });

  it('should write master key in localstorage if masterEncryption is turned on', () => {
    spyOn(localStorage, 'setItem').and.callFake(mockLocalStorage.setItem);

    component.db.masterEncryption = true;
    component.masterKey = 'abcd-0987654321';
    component.connectionID = '12345678';

    component.checkMasterPassword();

    expect(localStorage.setItem).toHaveBeenCalledOnceWith('12345678__masterKey', 'abcd-0987654321');
  })

  it('should remove master key in localstorage if masterEncryption is turned off', () => {
    spyOn(localStorage, 'removeItem').and.callFake(mockLocalStorage.removeItem);

    component.db.masterEncryption = false;
    component.connectionID = '12345678';

    component.checkMasterPassword();

    expect(localStorage.removeItem).toHaveBeenCalledOnceWith('12345678__masterKey');
  })

  it('should create direct connection', () => {
    fakeConnectionsService.createConnection.and.returnValue(of(connectionCredsApp));
    spyOnProperty(component, "db", "get").and.returnValue(connectionCredsApp);
    component.createConnectionRequest();

    expect(component.connectionID).toEqual('9d5f6d0f-9516-4598-91c4-e4fe6330b4d4');
  })

  it('should create agent connection and set token', () => {
    const dbApp = {
      title: "Agent connection",
      type: 'agent_oracle',
      port: 5432,
      connectionType: ConnectionType.Agent
    };

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
      title: "Agent connection",
      type: 'agent_oracle',
      port: 5432,
      connectionType: ConnectionType.Agent
    };

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
    component.handleConnectionError('Hostname is invalid');

    expect(fakeDialogOpen).toHaveBeenCalledOnceWith(DbConnectionConfirmDialogComponent, {
      width: '25em',
      data: {
        dbCreds: connectionCredsApp,
        errorMessage: 'Hostname is invalid'
      }
    });
  })
});
