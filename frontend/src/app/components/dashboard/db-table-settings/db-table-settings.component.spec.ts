import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { DbTableSettingsComponent } from './db-table-settings.component';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { FormsModule, NgForm } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatInputModule } from '@angular/material/input';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TablesService } from 'src/app/services/tables.service';
import { of } from 'rxjs';
import { TableSettings, TableOrdering } from 'src/app/models/table';
import { ConnectionsService } from 'src/app/services/connections.service';
import { MatMenuModule } from '@angular/material/menu';

describe('DbTableSettingsComponent', () => {
  let component: DbTableSettingsComponent;
  let fixture: ComponentFixture<DbTableSettingsComponent>;
  let tablesService: TablesService;
  let connectionsService: ConnectionsService;

  const fakeFirstName = {
    "column_name": "FirstName",
    "column_default": null,
    "data_type": "varchar",
    "isExcluded": false,
    "isSearched": false,
    "auto_increment": false,
    "allow_null": false,
    "character_maximum_length": 30
  };
  const fakeId = {
    "column_name": "Id",
    "column_default": "auto_increment",
    "data_type": "int",
    "isExcluded": false,
    "isSearched": false,
    "auto_increment": true,
    "allow_null": false,
    "character_maximum_length": null
  };
  const fakeBool = {
    "column_name": "bool",
    "column_default": null,
    "data_type": "tinyint",
    "isExcluded": false,
    "isSearched": true,
    "auto_increment": false,
    "allow_null": true,
    "character_maximum_length": 1
  };

  const mockTableStructure = {
    "structure": [
      fakeFirstName,
      fakeId,
      fakeBool
    ],
    "primaryColumns": [
      {
        "data_type": "int",
        "column_name": "Id"
      }
    ],
    "foreignKeys": [
      {
        "referenced_column_name": "CustomerId",
        "referenced_table_name": "Customers",
        "constraint_name": "Orders_ibfk_2",
        "column_name": "Id"
      }
    ],
    "readonly_fields": [],
    "table_widgets": []
  }

  const mockTableSettings: TableSettings = {
    // id: "f3df6ca8-18af-4347-9777-47c086d83969",
    table_name: "actor",
    display_name: "",
    icon: "",
    search_fields: [],
    excluded_fields: [],
    list_fields: [],
    // identification_fields: [],
    // list_per_page: null,
    ordering: TableOrdering.Ascending,
    ordering_field: "",
    identity_column: "",
    readonly_fields: [],
    sortable_by: [],
    autocomplete_columns: [
      "FirstName"
    ],
    columns_view: [],
    sensitive_fields: [],
    connection_id: "63f804e4-8588-4957-8d7f-655e2309fef7"
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        MatDialogModule,
        FormsModule,
        MatSelectModule,
        MatRadioModule,
        MatInputModule,
        BrowserAnimationsModule,
        MatMenuModule
      ],
      declarations: [ DbTableSettingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DbTableSettingsComponent);
    component = fixture.componentInstance;
    tablesService = TestBed.inject(TablesService);
    connectionsService = TestBed.inject(ConnectionsService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set initial state', () => {
    spyOnProperty(connectionsService, 'currentConnectionID').and.returnValue('12345678');
    spyOnProperty(tablesService, 'currentTableName').and.returnValue('users');
    spyOn(tablesService, 'fetchTableStructure').and.returnValue(of(mockTableStructure));
    spyOn(tablesService, 'fetchTableSettings').and.returnValue(of(mockTableSettings));

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.fields).toEqual(['FirstName', 'Id', 'bool']);
    expect(component.fields_to_exclude).toEqual(['FirstName', 'bool']);
    expect(component.tableSettings).toEqual(mockTableSettings);
  });

  it('should update settings', () => {
    const fakeUpdateTableSettings = spyOn(tablesService, 'updateTableSettings').and.returnValue(of());
    component.isSettingsExist = true;
    component.connectionID = '12345678';
    component.tableName = 'users';
    component.tableSettings = mockTableSettings;

    component.updateSettings();

    expect(fakeUpdateTableSettings).toHaveBeenCalledOnceWith(true, '12345678', 'users', mockTableSettings);
  });

  it('should delete settings', () => {
    // const fakeUpdateTableSettings = spyOn(tablesService, 'updateTableSettings').and.returnValue(of());
    // component.isSettingsExist = true;
    component.connectionID = '12345678';
    component.tableName = 'users';
    // component.tableSettings = mockTableSettings;
    const fakeDeleteSettings = spyOn(tablesService, 'deleteTableSettings').and.returnValue(of());

    const testForm = <NgForm>{
      value: {
          name: "tableSettingsForm",
      }
    };

    component.resetSettings(testForm);

    expect(fakeDeleteSettings).toHaveBeenCalledOnceWith('12345678', 'users');
  });
});
