import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from "@angular/router/testing";
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { forwardRef } from '@angular/core';
import { of } from 'rxjs';

import { ConnectionSettingsComponent } from './connection-settings.component';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TablesService } from 'src/app/services/tables.service';
import { ConnectionsService } from 'src/app/services/connections.service';

describe('ConnectionSettingsComponent', () => {
  let component: ConnectionSettingsComponent;
  let fixture: ComponentFixture<ConnectionSettingsComponent>;
  let tablesService: TablesService;
  let connectionsService: ConnectionsService;

  const mockTablesList = [
    {
      "table": "customer",
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

  const mockConnectionSettings = {
    "id": "98a20557-6b38-46aa-b09b-d8a716421dd6",
    "hidden_tables": [
      "actor_info",
      "address"
    ],
    "connectionId": "63f804e4-8588-4957-8d7f-655e2309fef7"
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        MatDialogModule,
        FormsModule,
        MatSelectModule,
        BrowserAnimationsModule
      ],
      declarations: [ ConnectionSettingsComponent ],
      providers: [
        {
          provide: NG_VALUE_ACCESSOR,
          useExisting: forwardRef(() => ConnectionSettingsComponent),
          multi: true
        },
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {

    fixture = TestBed.createComponent(ConnectionSettingsComponent);
    component = fixture.componentInstance;
    tablesService = TestBed.inject(TablesService);
    connectionsService = TestBed.inject(ConnectionsService);
    spyOnProperty(connectionsService, 'currentConnectionID').and.returnValue('12345678');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set table list', () => {
    const fakeFetchTables = spyOn(tablesService, 'fetchTables').and.returnValue(of(mockTablesList));

    component.ngOnInit();
    fixture.detectChanges();

    expect(fakeFetchTables).toHaveBeenCalledOnceWith('12345678', true);
    expect(component.tablesList).toEqual([{
      "table": "customer",
      "permissions": {
        "visibility": true,
        "readonly": false,
        "add": true,
        "delete": true,
        "edit": true
      },
      "normalizedTableName": "Customers"
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
      "normalizedTableName": "Products"
    }]);
  });

  it('should show error if db is empty', () => {
    const fakeFetchTables = spyOn(tablesService, 'fetchTables').and.returnValue(of([]));

    component.ngOnInit();
    fixture.detectChanges();

    expect(fakeFetchTables).toHaveBeenCalledOnceWith('12345678', true);
    expect(component.noTablesError).toBeTrue();
  });

  it('should set table settings if they are existed', () => {
    const fakeGetSettings = spyOn(connectionsService, 'getConnectionSettings').and.returnValue(of(mockConnectionSettings));

    component.getSettings();

    expect(fakeGetSettings).toHaveBeenCalledOnceWith('12345678');
    expect(component.hiddenTables).toEqual(["actor_info", "address"]);
    expect(component.isSettingsExist).toBeTrue();
  });

  it('should set empty settings if they are not existed', () => {
    const fakeGetSettings = spyOn(connectionsService, 'getConnectionSettings').and.returnValue(of(null));

    component.getSettings();

    expect(fakeGetSettings).toHaveBeenCalledOnceWith('12345678');
    expect(component.hiddenTables).toEqual([]);
    expect(component.isSettingsExist).toBeFalse();
  });

  it('should create settings', () => {
    component.hiddenTables = ['customers', 'film'];
    const fakeCreateSettings = spyOn(connectionsService, 'createConnectionSettings').and.returnValue(of());

    component.createSettings();

    expect(fakeCreateSettings).toHaveBeenCalledOnceWith('12345678', ['customers', 'film']);
    expect(component.submitting).toBeFalse();
  });

  it('should update settings', () => {
    component.hiddenTables = ['customers'];
    const fakeUpdateSettings = spyOn(connectionsService, 'updateConnectionSettings').and.returnValue(of());

    component.updateSettings();

    expect(fakeUpdateSettings).toHaveBeenCalledOnceWith('12345678', ['customers']);
    expect(component.submitting).toBeFalse();
  });

  it('should reset settings', () => {
    const fakeDeleteSettings = spyOn(connectionsService, 'deleteConnectionSettings').and.returnValue(of());

    component.resetSettings();

    expect(fakeDeleteSettings).toHaveBeenCalledOnceWith('12345678');
    expect(component.submitting).toBeFalse();
  });
});
