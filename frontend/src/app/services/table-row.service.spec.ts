import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TableRowService } from './table-row.service';
import { NotificationsService } from './notifications.service';
import { BannerActionType, BannerType } from '../models/banner';

describe('TableRowService', () => {
  let service: TableRowService;
  let httpMock: HttpTestingController;

  let fakeNotifications;

  const tableRowValues = {
    "Id": 11,
    "FirstName": "Yuriy"
  }

  const tableRowNetwork = {
    "row": tableRowValues,
    "structure": [
      {
        "column_name": "FirstName",
        "column_default": null,
        "data_type": "varchar",
        "isExcluded": false,
        "isSearched": false,
        "auto_increment": false,
        "allow_null": false,
        "character_maximum_length": 30
      },
      {
        "column_name": "Id",
        "column_default": null,
        "data_type": "int",
        "isExcluded": false,
        "isSearched": false,
        "auto_increment": false,
        "allow_null": false,
        "character_maximum_length": 11
      }
    ],
    "foreignKeys": [],
    "primaryColumns": [
      {
        "data_type": "int",
        "column_name": "Id"
      }
    ],
    "readonly_fields": [],
    "table_widgets": []
  }

  const fakeError = {
    "message": "Connection error",
    "statusCode": 400,
    "type": "no_master_key"
  }

  beforeEach(() => {
    fakeNotifications = jasmine.createSpyObj('NotificationsService', ['showErrorSnackbar', 'showSuccessSnackbar', 'showBanner']);

    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        MatSnackBarModule
      ],
      providers: [
        {
          provide: NotificationsService,
          useValue: fakeNotifications
        },
      ]
    });

    service = TestBed.get(TableRowService);
    httpMock = TestBed.get(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call fetchTableRow', () => {
    let isSubscribeCalled = false;

    service.fetchTableRow('12345678', 'users_table', {id: 1}).subscribe(res => {
      expect(res).toEqual(tableRowNetwork);
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/table/row/12345678?id=1&tableName=users_table`);
    expect(req.request.method).toBe("GET");
    req.flush(tableRowNetwork);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should call addTableRow and show Success snackbar', () => {
    let isSubscribeCalled = false;

    service.addTableRow('12345678', 'users_table', tableRowValues).subscribe(res => {
      expect(res).toEqual(tableRowValues);
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('The row has been added successfully to "users_table" table.');
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/table/row/12345678?tableName=users_table`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual(tableRowValues);
    req.flush(tableRowValues);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall addTableRow and show Error banner', async () => {
    const addTableRow = service.addTableRow('12345678', 'users_table', tableRowValues).toPromise();

    const req = httpMock.expectOne(`/table/row/12345678?tableName=users_table`);
    expect(req.request.method).toBe("POST");
    req.flush(fakeError, {status: 400, statusText: ''});
    await addTableRow;

    expect(fakeNotifications.showBanner).toHaveBeenCalledWith(BannerType.Error, fakeError.message, [jasmine.objectContaining({
      type: BannerActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call updateTableRow and show Success snackbar', () => {
    let isSubscribeCalled = false;

    service.updateTableRow('12345678', 'users_table', {id: 1}, tableRowValues).subscribe(res => {
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('The row has been updated successfully in "users_table" table.');
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/table/row/12345678?id=1&tableName=users_table`);
    expect(req.request.method).toBe("PUT");
    expect(req.request.body).toEqual(tableRowValues);
    req.flush(tableRowValues);

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall updateTableRow and show Error banner', async () => {
    const addTableRow = service.updateTableRow('12345678', 'users_table', {id: 1}, tableRowValues).toPromise();

    const req = httpMock.expectOne(`/table/row/12345678?id=1&tableName=users_table`);
    expect(req.request.method).toBe("PUT");
    req.flush(fakeError, {status: 400, statusText: ''});
    await addTableRow;

    expect(fakeNotifications.showBanner).toHaveBeenCalledWith(BannerType.Error, fakeError.message, [jasmine.objectContaining({
      type: BannerActionType.Button,
      caption: 'Dismiss',
    })]);
  });

  it('should call deleteTableRow and show Success snackbar', () => {
    let isSubscribeCalled = false;

    service.deleteTableRow('12345678', 'users_table', {id: 1}).subscribe(res => {
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledOnceWith('Row has been deleted successfully from "users_table" table.');
      isSubscribeCalled = true;
    });

    const req = httpMock.expectOne(`/table/row/12345678?id=1&tableName=users_table`);
    expect(req.request.method).toBe("DELETE");
    req.flush({deleted:	true});

    expect(isSubscribeCalled).toBe(true);
  });

  it('should fall deleteTableRow and show Error snackbar', async () => {
    const deleteTableRow = service.deleteTableRow('12345678', 'users_table', {id: 1}).toPromise();

    const req = httpMock.expectOne(`/table/row/12345678?id=1&tableName=users_table`);
    expect(req.request.method).toBe("DELETE");
    req.flush(fakeError, {status: 400, statusText: ''});
    await deleteTableRow;

    expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledOnceWith(fakeError.message);
  });
});
