import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditComponent } from './audit.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from "@angular/router/testing";
import { TablesService } from 'src/app/services/tables.service';
import { UsersService } from 'src/app/services/users.service';
import { of } from 'rxjs';
import { LogAction, LogStatus } from 'src/app/models/logs';
import { InfoDialogComponent } from './info-dialog/info-dialog.component';

describe('AuditComponent', () => {
  let component: AuditComponent;
  let fixture: ComponentFixture<AuditComponent>;
  let dialog: MatDialog;
  let tablesService: TablesService;
  let usersService: UsersService;

  const mockTablesListResponse = [
    {
      "table": "customers",
      "permissions": {
        "visibility": true,
        "readonly": false,
        "add": true,
        "delete": true,
        "edit": true
      }
    },
    {
      "table": "Orders",
      "permissions": {
        "visibility": true,
        "readonly": false,
        "add": true,
        "delete": true,
        "edit": true
      },
      "display_name": "Created orders"
    },
    {
      "table": "product",
      "permissions": {
        "visibility": true,
        "readonly": false,
        "add": true,
        "delete": true,
        "edit": true
      }
    }
  ];

  const mockUsersList = [
    {
      "id": "1369ab9e-45d1-4d42-9feb-e3c8f53355ea",
      "isActive": true,
      "email": "lyubov+ytrsdzxfcgvhb@voloshko.com",
      "createdAt": "2021-09-03T10:29:48.100Z"
    },
    {
      "id": "1369ab9e-45d1-4d42-9feb-e3c8f53355ea",
      "isActive": true,
      "email": "lyubov+ytrsdzxfcgvhb@voloshko.com",
      "createdAt": "2021-09-03T10:29:48.100Z"
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        MatDialogModule,
        MatPaginatorModule,
        BrowserAnimationsModule
      ],
      declarations: [ AuditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AuditComponent);
    component = fixture.componentInstance;
    tablesService = TestBed.inject(TablesService);
    usersService = TestBed.inject(UsersService);
    dialog = TestBed.get(MatDialog);

    fixture.autoDetectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fill users and tables lists', async () => {
    spyOn(tablesService, 'fetchTables').and.returnValue(of(mockTablesListResponse));
    spyOn(usersService, 'fetchConnectionUsers').and.returnValue(of(mockUsersList));

    component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.tablesList).toEqual([
      {
        "table": "customers",
        "permissions": {
          "visibility": true,
          "readonly": false,
          "add": true,
          "delete": true,
          "edit": true
        },
        normalizedTableName: "Customers"
      },
      {
        "table": "Orders",
        "permissions": {
          "visibility": true,
          "readonly": false,
          "add": true,
          "delete": true,
          "edit": true
        },
        "display_name": "Created orders"
      },
      {
        "table": "product",
        "permissions": {
          "visibility": true,
          "readonly": false,
          "add": true,
          "delete": true,
          "edit": true
        },
        normalizedTableName: "Products"
      }
    ]);
    expect(component.usersList).toEqual(mockUsersList);
  });

  it('should open log information dialog', () => {
    const fakeDialog = spyOn(dialog, 'open');
    const fakeLog = {
      Action: "received rows",
      Date: "09/09/2021 5:47 PM",
​      Status: LogStatus.Successfully,
      Table: "Customers",
      User: "lyubov+ytrsdzxfcgvhb@voloshko.com",
      createdAt: "2021-09-09T14:47:44.160Z",
      currentValue: null,
      operationType: LogAction.ReceiveRow,
      prevValue: null
    }

    component.openInfoLogDialog(fakeLog);
    expect(fakeDialog).toHaveBeenCalledOnceWith(InfoDialogComponent, {
      width: '50em',
      data: fakeLog
    });
  });
});
