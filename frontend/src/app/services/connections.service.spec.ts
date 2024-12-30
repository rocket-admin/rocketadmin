import { AlertActionType, AlertType } from '../models/alert';
import { ConnectionType, DBtype } from '../models/connection';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { delay, of } from 'rxjs';

import { AccessLevel } from '../models/user';
import { ConnectionsService } from './connections.service';
import { MasterPasswordService } from './master-password.service';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationsService } from './notifications.service';
import { RouterTestingModule } from "@angular/router/testing";
import { TestBed } from '@angular/core/testing';
import exp from 'constants';

fdescribe('ConnectionsService', () => {
  let httpMock: HttpTestingController;
  let service: ConnectionsService;

  let fakeNotifications;
  let fakeMasterPassword;

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

  const connectionCredsRequested = {
    "title": "Test connection via SSH tunnel to mySQL",
    "masterEncryption": false,
    "type": DBtype.MySQL,
    "host": "database-2.cvfuxe8nltiq.us-east-2.rds.amazonaws.com",
    "port": 3306,
    "username": "admin",
    "database": "testDB",
    "schema": null,
    "sid": null,
    "id": "9d5f6d0f-9516-4598-91c4-e4fe6330b4d4",
    "ssh": true,
    "sshHost": "3.134.99.192",
    "sshPort": 22,
    "sshUsername": "ubuntu",
    "ssl": false,
    "cert": null,
    "connectionType": ConnectionType.Direct,
    "azure_encryption": false,
    "signing_key": ''
  }

  const connectionCredsNetwork = {
    "title": "Test connection via SSH tunnel to mySQL",
    "masterEncryption": false,
    "type": DBtype.MySQL,
    "host": "database-2.cvfuxe8nltiq.us-east-2.rds.amazonaws.com",
    "port": 3306,
    "username": "admin",
    "database": "testDB",
    "schema": null,
    "sid": null,
    "id": "9d5f6d0f-9516-4598-91c4-e4fe6330b4d4",
    "ssh": true,
    "sshHost": "3.134.99.192",
    "sshPort": 22,
    "sshUsername": "ubuntu",
    "ssl": false,
    "cert": null,
    "azure_encryption": false,
    "signing_key": ''
  }

  const fakeError = {
    "message": "Connection error",
    "statusCode": 400,
    "type": "no_master_key",
    "originalMessage": "Connection error details"
  };

  beforeEach(() => {
    fakeNotifications = jasmine.createSpyObj('NotificationsService', ['showErrorSnackbar', 'showSuccessSnackbar', 'showAlert']);
    fakeMasterPassword = jasmine.createSpyObj('MasterPasswordService', ['showMasterPasswordDialog']);

    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        MatDialogModule
      ],
      providers: [
        ConnectionsService,
        {
          provide: NotificationsService,
          useValue: fakeNotifications
        },
        {
          provide: MasterPasswordService,
          useValue: fakeMasterPassword
        }
      ]
    });

    httpMock = TestBed.get(HttpTestingController);
    service = TestBed.get(ConnectionsService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it ('should set connectionID', () => {
    service.setConnectionID('12345678');
    expect(service.connectionID).toEqual('12345678');
  })

  it ('should get currentConnectionID', () => {
    service.connectionID = '12345678';
    expect(service.currentConnectionID).toEqual('12345678');
  })

  it('should set connectionInfo if connection exists', () => {
    const fakeFetchConnection = spyOn(service, 'fetchConnection').and.returnValue(of({
        "connection": connectionCredsApp,
        "accessLevel": "edit",
        "groupManagement": true
    }));
    service.setConnectionInfo('12345678');
    expect(service.connection).toEqual(connectionCredsApp);
    expect(service.connectionAccessLevel).toEqual('edit');
    expect(service.groupsAccessLevel).toEqual(true);

    fakeFetchConnection.calls.reset();
  })

  it('should set connectionInfo in initial state if connection does not exist', () => {
    service.setConnectionInfo(null);
    expect(service.connection).toEqual(service.connectionInitialState);
  })

  it('should get currentConnection', () => {
    service.connection = connectionCredsApp;
    expect(service.currentConnection).toEqual(connectionCredsApp);
  })

  it('should get currentConnectionAccessLevel', () => {
    service.connectionAccessLevel = AccessLevel.Edit;
    expect(service.currentConnectionAccessLevel).toEqual('edit');
  })

  it('should get currentConnectionGroupAccessLevel', () => {
    service.groupsAccessLevel = false;
    expect(service.currentConnectionGroupAccessLevel).toEqual(false);
  })

  it('should define a type of connections without agent_ prefix', () => {
    const connection = service.defineConnecrionType(connectionCredsNetwork);

    expect(connection).toEqual({
      "title": "Test connection via SSH tunnel to mySQL",
      "masterEncryption": false,
      "type": DBtype.MySQL,
      "host": "database-2.cvfuxe8nltiq.us-east-2.rds.amazonaws.com",
      "port": 3306,
      "username": "admin",
      "database": "testDB",
      "schema": null,
      "sid": null,
      "id": "9d5f6d0f-9516-4598-91c4-e4fe6330b4d4",
      "ssh": true,
      "sshHost": "3.134.99.192",
      "sshPort": 22,
      "sshUsername": "ubuntu",
      "ssl": false,
      "cert": null,
      "azure_encryption": false,
      "connectionType": ConnectionType.Direct,
      "signing_key": ''
    })
  })

  it('should define a type of connections with agent_ prefix', () => {
    const connection = service.defineConnecrionType({
      "title": "Test connection via SSH tunnel to mySQL",
      "masterEncryption": false,
      "type": "agent_mysql",
      "host": "database-2.cvfuxe8nltiq.us-east-2.rds.amazonaws.com",
      "port": 3306,
      "username": "admin",
      "database": "testDB",
      "schema": null,
      "sid": null,
      "id": "9d5f6d0f-9516-4598-91c4-e4fe6330b4d4",
      "ssh": true,
      "sshHost": "3.134.99.192",
      "sshPort": 22,
      "sshUsername": "ubuntu",
      "ssl": false,
      "cert": null,
      "azure_encryption": false
    });

    expect(connection).toEqual({
      "title": "Test connection via SSH tunnel to mySQL",
      "masterEncryption": false,
      "type": DBtype.MySQL,
      "host": "database-2.cvfuxe8nltiq.us-east-2.rds.amazonaws.com",
      "port": 3306,
      "username": "admin",
      "database": "testDB",
      "schema": null,
      "sid": null,
      "id": "9d5f6d0f-9516-4598-91c4-e4fe6330b4d4",
      "ssh": true,
      "sshHost": "3.134.99.192",
      "sshPort": 22,
      "sshUsername": "ubuntu",
      "ssl": false,
      "cert": null,
      "azure_encryption": false,
      "connectionType": ConnectionType.Agent
    })
  })

  it('should get current page slug', () => {
    service.currentPage = 'dashboard';
    expect(service.currentTab).toEqual('dashboard');
  })

  it('should get visible tabs dashboard and audit in any case', () => {
    expect(service.visibleTabs).toEqual(['dashboard', 'audit']);
  })

  it('should get visible tabs dashboard, audit and permissions if groupsAccessLevel is true', () => {
    service.groupsAccessLevel = true;
    expect(service.visibleTabs).toEqual(['dashboard', 'audit', 'permissions']);
  })

  it('should get visible tabs dashboard, audit, edit-db and connection-settings if connectionAccessLevel is edit', () => {
    service.connectionAccessLevel = AccessLevel.Edit;
    expect(service.visibleTabs).toEqual(['dashboard', 'audit', 'edit-db', 'connection-settings']);
  })

  it('should call fetchConnections', () => {
    let isSubscribeCalled = false;
    const connectionsList = {
      "connections": [
        {
          "connection": {
            "id": "3d5ecd09-b3a8-486a-a0ec-ff36c8d69a17",
            "title": "Test connection to OracleDB",
            "masterEncryption": true,
            "type": "oracledb",
            "host": "database-1.cvfuxe8nltiq.us-east-2.rds.amazonaws.com",
            "port": 1521,
            "username": "U2FsdGVkX19+rqtUQ3uLCM9fdaxIpXvfW6VzUhB8Geg=",
            "database": "U2FsdGVkX1/AlO3GRqUxPnTaJDtYB+HkGQ4mUOdPKlY=",
            "schema": null,
            "sid": "ORCL",
            "createdAt": "2021-01-04T11:59:37.641Z",
            "updatedAt": "2021-06-07T15:05:39.829Z",
            "ssh": false,
            "sshHost": null,
            "sshPort": null,
            "sshUsername": null,
            "ssl": false,
            "cert": null,
            "isTestConnection": true
          },
          "accessLevel": "edit"
        },
        {
          "connection": {
            "id": "bb66a2fc-a52e-4809-8542-7fa78c466e03",
            "title": "Test connection via SSH tunnel to mySQL",
            "masterEncryption": false,
            "type": "mysql",
            "host": "database-2.cvfuxe8nltiq.us-east-2.rds.amazonaws.com",
            "port": 3306,
            "username": "admin",
            "database": "testDB",
            "schema": null,
            "sid": null,
            "createdAt": "2020-12-24T20:13:30.327Z",
            "updatedAt": "2020-12-24T20:13:30.327Z",
            "ssh": true,
            "sshHost": "3.134.99.192",
            "sshPort": 22,
            "sshUsername": "ubuntu",
            "ssl": false,
            "cert": null,
            "isTestConnection": true
          },
          "accessLevel": "readonly"
        }
      ],
      "connectionsCount": 2
    }

    service.fetchConnections().subscribe(connectionData => {
      expect(connectionData).toEqual(connectionsList);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/connections`);
    expect(req.request.method).toBe("GET");
    req.flush(connectionsList);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall with error for fetchConnections and show Error alert', async () => {
    const connections = service.fetchConnections().toPromise();
    const req = httpMock.expectOne(`/connections`);
    expect(req.request.method).toBe("GET");
    req.flush(fakeError, {status: 400, statusText: ''});
    await connections;

    expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call fetchConnection', () => {
    let isSubscribeCalled = false;
    const connectionItem = {
      "connection": connectionCredsNetwork,
      "accessLevel": "edit",
      "groupManagement": true
    }

    service.fetchConnection('12345678').subscribe(connectionData => {
      expect(connectionData).toEqual(connectionItem);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/connection/one/12345678`);
    expect(req.request.method).toBe("GET");
    req.flush(connectionItem);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall for fetchConnection and show Error snackbar', async () => {
    const connection = service.fetchConnection('12345678').toPromise();

    const req = httpMock.expectOne(`/connection/one/12345678`);
    expect(req.request.method).toBe("GET");
    req.flush(fakeError, {status: 400, statusText: ''});
    await connection;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledOnceWith(fakeError.message);
  });

  it('should fall for fetchConnection and show Master password request', async () => {
    // router should to be mocked

    const connection = service.fetchConnection('12345678').toPromise();

    const req = httpMock.expectOne(`/connection/one/12345678`);
    expect(req.request.method).toBe("GET");
    req.flush(fakeError, {status: 400, statusText: ''});
    await connection;

    expect(fakeMasterPassword.showMasterPasswordDialog).toHaveBeenCalled();
  });

  it('should call testConnection', () => {
    let isSubscribeCalled = false;

    service.testConnection('12345678', connectionCredsApp).subscribe(res => {
      expect(res).toEqual(true);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/connection/test?connectionId=12345678`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual(connectionCredsRequested);
    req.flush(true);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall testConnection and show Error alert', async () => {
    const isConnectionWorks = service.testConnection('12345678', connectionCredsApp).toPromise();

    const req = httpMock.expectOne(`/connection/test?connectionId=12345678`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual(connectionCredsRequested);
    req.flush(fakeError, {status: 400, statusText: ''});
    await isConnectionWorks;

    expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, []);
  });

  it('should call createConnection and show Success Snackbar', async () => {
    service.createConnection(connectionCredsApp, 'master_key_12345678').subscribe(res => {
      expect(res).toEqual(connectionCredsNetwork);
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledWith('Connection was added successfully.');
    });

    const req = httpMock.expectOne(`/connection`);
    expect(req.request.method).toBe("POST");
    expect(req.request.headers.get('masterpwd')).toBe('master_key_12345678');
    expect(req.request.body).toEqual(connectionCredsRequested);
    req.flush(connectionCredsNetwork);
  });

  it('should fall for createConnection and show Error alert', async () => {
    const createdConnection = service.createConnection(connectionCredsApp, 'master_key_12345678').toPromise();

    const req = httpMock.expectOne(`/connection`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual(connectionCredsRequested);
    req.flush(fakeError, {status: 400, statusText: ''});

    await expectAsync(createdConnection).toBeRejectedWith(new Error(fakeError.message));
    expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, []);
  });

  it('should call updateConnection and show Success Snackbar', async () => {
    service.updateConnection(connectionCredsApp, 'master_key_12345678').subscribe(res => {
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledWith('Connection has been updated successfully.');
    });

    const req = httpMock.expectOne(`/connection/9d5f6d0f-9516-4598-91c4-e4fe6330b4d4`);
    expect(req.request.method).toBe("PUT");
    expect(req.request.headers.get('masterpwd')).toBe('master_key_12345678');
    expect(req.request.body).toEqual(connectionCredsRequested);
    req.flush(connectionCredsNetwork);
  });

  it('should fall for updateConnection and show Error alert', async () => {
    const updatedConnection = service.updateConnection(connectionCredsApp, 'master_key_12345678').toPromise();

    const req = httpMock.expectOne(`/connection/9d5f6d0f-9516-4598-91c4-e4fe6330b4d4`);
    expect(req.request.method).toBe("PUT");
    expect(req.request.body).toEqual(connectionCredsRequested);
    req.flush(fakeError, {status: 400, statusText: ''});

    await expectAsync(updatedConnection).toBeRejectedWith(new Error(fakeError.message));

    expect(fakeNotifications.showAlert).toHaveBeenCalledOnceWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call deleteConnection and show Success Snackbar', () => {
    let isSubscribeCalled = false;
    const metadata = {
      reason: 'missing-features',
      message: 'i want to add tables'
    }

    service.deleteConnection('12345678', metadata).subscribe(res => {
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('Connection has been deleted successfully.');
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/connection/delete/12345678`);
    expect(req.request.method).toBe("PUT");
    req.flush(connectionCredsNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall for deleteConnection and show Error snackbar', async () => {
    const metadata = {
      reason: 'missing-features',
      message: 'i want to add tables'
    }

    const deletedConnection = service.deleteConnection('12345678', metadata).toPromise();

    const req = httpMock.expectOne(`/connection/delete/12345678`);
    expect(req.request.method).toBe("PUT");
    req.flush(fakeError, {status: 400, statusText: ''});
    await deletedConnection;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledOnceWith(fakeError.message);
  });

  it('should call fetchAuditLog', () => {
    let isSubscribeCalled = false;

    service.fetchAuditLog({
      connectionID: '12345678',
      tableName: 'users_table',
      userEmail: 'eric.cartman@south.park',
      requstedPage: 2,
      chunkSize: 10
    }).subscribe(res => {
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/logs/12345678?page=2&perPage=10&tableName=users_table&email=eric.cartman@south.park`);
    expect(req.request.method).toBe("GET");
    req.flush({});

    expect(isSubscribeCalled).toBe(true);
  });

  it('should call fetchAuditLog and exclude tableName param if all tables are requested', () => {
    let isSubscribeCalled = false;

    service.fetchAuditLog({
      connectionID: '12345678',
      tableName: 'showAll',
      userEmail: 'eric.cartman@south.park',
      requstedPage: 2,
      chunkSize: 10
    }).subscribe(res => {
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/logs/12345678?page=2&perPage=10&email=eric.cartman@south.park`);
    req.flush({});

    expect(isSubscribeCalled).toBe(true);
  });

  it('should call fetchAuditLog and exclude email param if all users are requested', () => {
    let isSubscribeCalled = false;

    service.fetchAuditLog({
      connectionID: '12345678',
      tableName: 'users_table',
      userEmail: 'showAll',
      requstedPage: 2,
      chunkSize: 10
    }).subscribe(res => {
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/logs/12345678?page=2&perPage=10&tableName=users_table`);
    req.flush({});

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall for fetchAuditLog and show Error snackbar', async () => {
    const logs = service.fetchAuditLog({
      connectionID: '12345678',
      tableName: 'users_table',
      userEmail: 'eric.cartman@south.park',
      requstedPage: 2,
      chunkSize: 10
    }).toPromise();

    const req = httpMock.expectOne(`/logs/12345678?page=2&perPage=10&tableName=users_table&email=eric.cartman@south.park`);
    expect(req.request.method).toBe("GET");
    req.flush(fakeError, {status: 400, statusText: ''});
    await logs;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledOnceWith(fakeError.message);
  });

  it('should call getConnectionSettings', (done) => {
    const connectionSettingsNetwork = {
        "id": "dd58c614-866d-4293-8c65-351c667d29ca",
        "connectionId": "12345678",
        "logo_url": 'https://example.com/logo.png',
        "company_name": 'Example Company',
        "primary_color": '#123456',
        "secondary_color": '#654321',
        "hidden_tables": [
            "users",
            "orders"
        ],
        "tables_audit": true
    }

    const mockThemeService = jasmine.createSpyObj('_themeService', ['updateColors']);
    service['_themeService'] = mockThemeService;

    service.getConnectionSettings('12345678').subscribe(res => {
        expect(res).toEqual(connectionSettingsNetwork);
        expect(service.connectionLogo).toEqual('https://example.com/logo.png');
        expect(service.companyName).toEqual('Example Company');
        expect(mockThemeService.updateColors).toHaveBeenCalledWith({
            palettes: { primaryPalette: '#123456', accentedPalette: '#654321' },
        });
        done();
    });

    const req = httpMock.expectOne(`/connection/properties/12345678`);
    expect(req.request.method).toBe("GET");
    req.flush(connectionSettingsNetwork);
  });

  it('should fall for getConnectionSettings and show Error snackbar', async () => {
    const settings = service.getConnectionSettings('12345678').toPromise();

    const req = httpMock.expectOne(`/connection/properties/12345678`);
    expect(req.request.method).toBe("GET");
    req.flush(fakeError, {status: 400, statusText: ''});
    await settings;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledOnceWith(`${fakeError.message}.`);
  });

  it('should call createConnectionSettings and show success snackbar', () => {
    let isSubscribeCalled = false;

    service.createConnectionSettings('12345678', {hidden_tables: ['users', 'orders']}).subscribe(res => {
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('Connection settings has been created successfully.');
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/connection/properties/12345678`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({
      "hidden_tables": [
        "users",
        "orders"
      ]
    });
    req.flush({
      "id": "dd58c614-866d-4293-8c65-351c667d29ca",
      "hidden_tables": [
        "users",
        "orders"
      ],
      "connectionId": "12345678"
    });

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall createConnectionSettings and show Error alert', async () => {
    const createSettings = service.createConnectionSettings('12345678', {hidden_tables: ['users', 'orders']}).toPromise();

    const req = httpMock.expectOne(`/connection/properties/12345678`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({
      "hidden_tables": [
        "users",
        "orders"
      ]
    });
    req.flush(fakeError, {status: 400, statusText: ''});
    await createSettings;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith(`${fakeError.message}.`);
  });

  it('should call updateConnectionSettings and show success snackbar', () => {
    let isSubscribeCalled = false;

    service.updateConnectionSettings('12345678', {hidden_tables: ['users', 'orders', 'products']}).subscribe(res => {
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('Connection settings has been updated successfully.');
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/connection/properties/12345678`);
    expect(req.request.method).toBe("PUT");
    expect(req.request.body).toEqual({
      "hidden_tables": [
        "users",
        "orders",
        "products"
      ]
    });
    req.flush({
      "id": "dd58c614-866d-4293-8c65-351c667d29ca",
      "hidden_tables": [
        "users",
        "orders",
        "products"
      ],
      "connectionId": "12345678"
    });

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall createConnectionSettings and show Error alert', async () => {
    const updateSettings = service.updateConnectionSettings('12345678', {hidden_tables: ['users', 'orders', 'products']}).toPromise();

    const req = httpMock.expectOne(`/connection/properties/12345678`);
    expect(req.request.method).toBe("PUT");
    expect(req.request.body).toEqual({
      "hidden_tables": [
        "users",
        "orders",
        "products"
      ]
    });
    req.flush(fakeError, {status: 400, statusText: ''});
    await updateSettings;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith(`${fakeError.message}.`);
  });

  it('should call deleteConnectionSettings and show success snackbar', () => {
    let isSubscribeCalled = false;

    service.deleteConnectionSettings('12345678').subscribe(res => {
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('Connection settings has been removed successfully.');
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/connection/properties/12345678`);
    expect(req.request.method).toBe("DELETE");
    req.flush({});

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall deleteConnectionSettings and show Error alert', async () => {
    const deleteSettings = service.deleteConnectionSettings('12345678').toPromise();

    const req = httpMock.expectOne(`/connection/properties/12345678`);
    expect(req.request.method).toBe("DELETE");
    req.flush(fakeError, {status: 400, statusText: ''});
    await deleteSettings;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith(`${fakeError.message}.`);
  });
});