import { AlertActionType, AlertType } from '../models/alert';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Angulartics2Module } from 'angulartics2';

import { NotificationsService } from './notifications.service';
import { TableOrdering } from '../models/table';
import { TablesService } from './tables.service';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('TablesService', () => {
  let service: TablesService;
  let httpMock: HttpTestingController;

  let fakeNotifications;

  const structureNetwork = [
    {
      "column_name": "id",
      "column_default": "nextval('customers_id_seq'::regclass)",
      "data_type": "integer",
      "isExcluded": false,
      "isSearched": false,
      "auto_increment": true,
      "allow_null": false,
      "character_maximum_length": null
    },
    {
      "column_name": "firstname",
      "column_default": null,
      "data_type": "character varying",
      "isExcluded": false,
      "isSearched": false,
      "auto_increment": false,
      "allow_null": true,
      "character_maximum_length": 30
    },
    {
      "column_name": "lastname",
      "column_default": null,
      "data_type": "character varying",
      "isExcluded": false,
      "isSearched": false,
      "auto_increment": false,
      "allow_null": true,
      "character_maximum_length": 30
    },
    {
      "column_name": "email",
      "column_default": null,
      "data_type": "character varying",
      "isExcluded": false,
      "isSearched": false,
      "auto_increment": false,
      "allow_null": false,
      "character_maximum_length": 30
    },
    {
      "column_name": "age",
      "column_default": null,
      "data_type": "integer",
      "isExcluded": false,
      "isSearched": false,
      "auto_increment": false,
      "allow_null": true,
      "character_maximum_length": null
    }
  ]

  const usersTableNetwork = {
    "rows": [
      {
        "id": 33,
        "firstname": "Alex",
        "lastname": "Lichter",
        "email": "new-user-5@email.com",
        "age": 24
      },
      {
        "id": 34,
        "firstname": "Alex",
        "lastname": "Lichter",
        "email": "new-user-5@email.com",
        "age": 24
      },
      {
        "id": 35,
        "firstname": "Alex",
        "lastname": "Smith",
        "email": "some-new@email.com",
        "age": 24
      }
    ],
    "primaryColumns": [
      {
        "column_name": "id",
        "data_type": "integer"
      }
    ],
    "pagination": {
      "total": 30,
      "lastPage": 1,
      "perPage": 30,
      "currentPage": 1
    },
    "sortable_by": [],
    "ordering": "ASC",
    "structure": structureNetwork,
    "foreignKeys": []
  }

  const tableSettingsNetwork = {
    "id": "dbf4d648-32f8-4202-9c18-300e1a4dc959",
    "table_name": "contacts_with_uuid",
    "display_name": "",
    "search_fields": [],
    "excluded_fields": [],
    "list_fields": [],
    "identification_fields": [],
    "list_per_page": null,
    "ordering": "ASC",
    "ordering_field": "",
    "identity_column": "",
    "readonly_fields": [],
    "sortable_by": [],
    "autocomplete_columns": [
      "first_name",
      "last_name",
      "email"
    ],
    "columns_view": [
      "first_name",
      "last_name",
      "email"
    ],
    "connection_id": "e4b99271-badd-4112-9967-b99dd8024dda"
  };

  const tableSettingsApp = {
    "autocomplete_columns": [
      "first_name",
      "last_name",
      "email"
    ],
    "columns_view": [
      "first_name",
      "last_name",
      "email"
    ],
    "connection_id": "e4b99271-badd-4112-9967-b99dd8024dda",
    "display_name": "",
    "icon": "",
    "excluded_fields": [],
    "id": "dbf4d648-32f8-4202-9c18-300e1a4dc959",
    "identification_fields": [],
    "identity_column": "",
    "list_fields": [],
    "list_per_page": null,
    "ordering": TableOrdering.Descending,
    "ordering_field": "",
    "readonly_fields": [],
    "search_fields": [],
    "sortable_by": [],
    "table_name": "contacts_with_uuid",
    "sensitive_fields": [],
    "allow_csv_export": true,
    "allow_csv_import": true
  };

  const tableWidgetsNetwork = [
    {
      "id": "a57e0c7f-a348-4aae-9ec4-fdbec0c0d0b6",
      "field_name": "email",
      "widget_type": "Textarea",
      "widget_params": {},
      "name": "user email",
      "description": ""
    }
  ]

  const tableWidgetsApp = [
    {
      "description": "",
      "field_name": "email",
      "name": "user email",
      "widget_params": "",
      "widget_type": "Textarea"
    }
  ]

  const fakeError = {
    "message": "Connection error",
    "statusCode": 400,
    "type": "no_master_key",
    "originalMessage": "Connection error details",
  }

  beforeEach(() => {
    fakeNotifications = jasmine.createSpyObj('NotificationsService', ['showErrorSnackbar', 'showSuccessSnackbar', 'showAlert']);

    TestBed.configureTestingModule({
      imports: [
        MatSnackBarModule,
        Angulartics2Module.forRoot()
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: NotificationsService,
          useValue: fakeNotifications
        },
      ]
    });

    service = TestBed.inject(TablesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call setTableName', () => {
    service.setTableName('users_table');
    expect(service.tableName).toEqual('users_table');
  });

  it('should get currentTableName', () => {
    service.tableName = 'users_table';
    expect(service.currentTableName).toEqual('users_table');
  })

  it('should call fetchTables', () => {
    let isSubscribeCalled = false;
    const tablesNetwork = [
      {
        "0": {
          "table": "users",
          "permissions": {
            "visibility": true,
            "readonly": false,
            "add": true,
            "delete": true,
            "edit": true
          }
        }
      },
      {
        "1": {
          "table": "addresses",
          "permissions": {
            "visibility": true,
            "readonly": false,
            "add": true,
            "delete": true,
            "edit": true
          }
        }
      }
    ]

    service.fetchTables('12345678').subscribe(res => {
      expect(res).toEqual(tablesNetwork);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/connection/tables/12345678`);
    expect(req.request.method).toBe("GET");
    req.flush(tablesNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should call fetchTable with minimal params', () => {
    let isSubscribeCalled = false;

    service.fetchTable({
      connectionID: '12345678',
      tableName: 'users_table',
      requstedPage: 1,
      chunkSize: 30
    }).subscribe(res => {
      expect(res).toEqual(usersTableNetwork);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/table/rows/find/12345678?tableName=users_table&perPage=30&page=1`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ filters: undefined });
    req.flush(usersTableNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should call fetchTable for foreigh keys', () => {
    let isSubscribeCalled = false;

    service.fetchTable({
      connectionID: '12345678',
      tableName: 'users_table',
      requstedPage: 1,
      chunkSize: 30,
      foreignKeyRowName: 'position_id',
      foreignKeyRowValue: '9876',
      referencedColumn: 'id'
    }).subscribe(res => {
      expect(res).toEqual(usersTableNetwork);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(
      `/table/rows/find/12345678?tableName=users_table&perPage=30&page=1&f_position_id__eq=9876&referencedColumn=id`
    );
    expect(req.request.method).toBe("POST");
    req.flush(usersTableNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should call fetchTable with filters', () => {
    let isSubscribeCalled = false;

    service.fetchTable({
      connectionID: '12345678',
      tableName: 'users_table',
      requstedPage: 1,
      chunkSize: 30,
      filters: {
        city: {
          eq: 'NewYork'
        },
        age: {
          eq: '42'
        }
      }
    }).subscribe(res => {
      expect(res).toEqual(usersTableNetwork);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne('/table/rows/find/12345678?tableName=users_table&perPage=30&page=1');
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ filters: {
      city: {
        eq: 'NewYork'
      },
      age: {
        eq: '42'
      }
    }});
    req.flush(usersTableNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should call fetchTable with sortOrder DESC and sort_by City column', () => {
    let isSubscribeCalled = false;

    service.fetchTable({
      connectionID: '12345678',
      tableName: 'users_table',
      requstedPage: 1,
      chunkSize: 30,
      sortOrder: 'DESC',
      sortColumn: 'city'
    }).subscribe(res => {
      expect(res).toEqual(usersTableNetwork);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(
      `/table/rows/find/12345678?tableName=users_table&perPage=30&page=1&sort_by=city&sort_order=DESC`
    );
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ filters: undefined });
    req.flush(usersTableNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall fetchTable and show Error alert', async () => {
    const fetchTableRow = service.fetchTable({
      connectionID: '12345678',
      tableName: 'users_table',
      requstedPage: 1,
      chunkSize: 30
    }).toPromise();

    const req = httpMock.expectOne(`/table/rows/find/12345678?tableName=users_table&perPage=30&page=1`);
    expect(req.request.method).toBe("POST");
    req.flush(fakeError, {status: 400, statusText: ''});
    await fetchTableRow;

    expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
      caption: 'Dismiss',
    })]);
  });


  it('should call fetchTableStructure', () => {
    let isSubscribeCalled = false;
    const tableStructureNetwork = {
      "structure": structureNetwork,
      "foreignKeys": [],
      "readonly_fields": [],
      "table_widgets": []
    };

    service.fetchTableStructure('12345678', 'users_table').subscribe(res => {
      expect(res).toEqual(tableStructureNetwork);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/table/structure/12345678?tableName=users_table`);
    expect(req.request.method).toBe("GET");
    req.flush(tableStructureNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall fetchTableStructure and show Error snackbar', async () => {
    const fetchTableStructure = service.fetchTableStructure('12345678', 'users_table').toPromise();

    const req = httpMock.expectOne(`/table/structure/12345678?tableName=users_table`);
    expect(req.request.method).toBe("GET");
    req.flush(fakeError, {status: 400, statusText: ''});
    await fetchTableStructure;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledOnceWith(fakeError.message);
  });

  it('should call fetchTableSettings', () => {
    let isSubscribeCalled = false;

    service.fetchTableSettings('12345678', 'users_table').subscribe(res => {
      expect(res).toEqual(tableSettingsNetwork);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/settings?connectionId=12345678&tableName=users_table`);
    expect(req.request.method).toBe("GET");
    req.flush(tableSettingsNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall fetchTableSettings and show Error snackbar', async () => {
    const fetchTableSettings = service.fetchTableSettings('12345678', 'users_table').toPromise();

    const req = httpMock.expectOne(`/settings?connectionId=12345678&tableName=users_table`);
    expect(req.request.method).toBe("GET");
    req.flush(fakeError, {status: 400, statusText: ''});
    await fetchTableSettings;

    expect(fakeNotifications.showAlert).toHaveBeenCalledOnceWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call updateTableSettings for existing settings', () => {
    let isSubscribeCalled = false;

    service.updateTableSettings(true, '12345678', 'users_table', tableSettingsApp).subscribe(res => {
      // expect(res).toEqual(tableSettingsNetwork);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/settings?connectionId=12345678&tableName=users_table`);
    expect(req.request.method).toBe("PUT");
    expect(req.request.body).toEqual(tableSettingsApp);
    req.flush(tableSettingsNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should call updateTableSettings and create settings', () => {
    let isSubscribeCalled = false;

    service.updateTableSettings(false, '12345678', 'users_table', tableSettingsApp).subscribe(res => {
      // expect(res).toEqual(tableSettingsNetwork);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/settings?connectionId=12345678&tableName=users_table`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual(tableSettingsApp);
    req.flush(tableSettingsNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall updateTableSettings and show Error alert', async () => {
    const fetchTableSettings = service.updateTableSettings(true, '12345678', 'users_table', tableSettingsApp).toPromise();

    const req = httpMock.expectOne(`/settings?connectionId=12345678&tableName=users_table`);
    expect(req.request.method).toBe("PUT");
    req.flush(fakeError, {status: 400, statusText: ''});
    await fetchTableSettings;

    expect(fakeNotifications.showAlert).toHaveBeenCalledOnceWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call deleteTableSettings', () => {
    let isSubscribeCalled = false;

    service.deleteTableSettings('12345678', 'users_table').subscribe(res => {
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/settings?connectionId=12345678&tableName=users_table`);
    expect(req.request.method).toBe("DELETE");
    req.flush(tableSettingsNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall deleteTableSettings and show Error snackbar', async () => {
    const fetchTableSettings = service.deleteTableSettings('12345678', 'users_table').toPromise();

    const req = httpMock.expectOne(`/settings?connectionId=12345678&tableName=users_table`);
    expect(req.request.method).toBe("DELETE");
    req.flush(fakeError, {status: 400, statusText: ''});
    await fetchTableSettings;

    expect(fakeNotifications.showAlert).toHaveBeenCalledOnceWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call fetchTableWidgets', () => {
    let isSubscribeCalled = false;

    service.fetchTableWidgets('12345678', 'users_table').subscribe(res => {
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/widgets/12345678?tableName=users_table`);
    expect(req.request.method).toBe("GET");
    req.flush(tableSettingsNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall fetchTableWidgets and show Error alert', async () => {
    const fetchTableSettings = service.fetchTableWidgets('12345678', 'users_table').toPromise();

    const req = httpMock.expectOne(`/widgets/12345678?tableName=users_table`);
    expect(req.request.method).toBe("GET");
    req.flush(fakeError, {status: 400, statusText: ''});
    await fetchTableSettings;

    expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call updateTableWidgets', () => {
    let isSubscribeCalled = false;

    service.updateTableWidgets('12345678', 'users_table', tableWidgetsApp).subscribe(res => {
      expect(res).toEqual(tableWidgetsNetwork);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne('/widget/12345678?tableName=users_table');
    expect(req.request.method).toBe("POST");
    req.flush(tableWidgetsNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall updateTableWidgets and show Error bannner', async () => {
    const fetchTableSettings = service.updateTableWidgets('12345678', 'users_table', tableWidgetsApp).toPromise();

    const req = httpMock.expectOne('/widget/12345678?tableName=users_table');
    expect(req.request.method).toBe("POST");
    req.flush(fakeError, {status: 400, statusText: ''});
    await fetchTableSettings;

    expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, { abstract: fakeError.message, details: fakeError.originalMessage }, [jasmine.objectContaining({
      type: AlertActionType.Button,
      caption: 'Dismiss',
    })]);
  });
});
