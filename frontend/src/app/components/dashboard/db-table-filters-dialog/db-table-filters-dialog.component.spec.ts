import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DbTableFiltersDialogComponent } from './db-table-filters-dialog.component';
import { FormsModule }   from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from "@angular/router/testing";
import { TablesService } from 'src/app/services/tables.service';

describe('DbTableFiltersDialogComponent', () => {
  let component: DbTableFiltersDialogComponent;
  let fixture: ComponentFixture<DbTableFiltersDialogComponent>;

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

  const mockTableDataSource_Structure = [fakeFirstName, fakeId, fakeBool];

  const mockTableDataSource_ForeignKeysList = ["Id"];

  const mockTableDataSource_ForeignKeys = {
    Id: {
      "referenced_column_name": "CustomerId",
      "referenced_table_name": "Customers",
      "constraint_name": "Orders_ibfk_2",
      "column_name": "Id"
    }
  };

  const mockStructureForFilterDialog = {
    structure: mockTableDataSource_Structure,
    foreignKeysList: mockTableDataSource_ForeignKeysList,
    foreignKeys: mockTableDataSource_ForeignKeys,
    widgets: []
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DbTableFiltersDialogComponent ],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        MatDialogModule,
        FormsModule,
        MatSelectModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {
          connectionID: '12345678',
          tableName: 'users',
          displayTableName: 'Users',
          structure: mockStructureForFilterDialog
        }},
        { provide: MatDialogRef, useValue: {} },
        // { provide: ActivatedRoute, useValue: {} }
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DbTableFiltersDialogComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should setup the initial state of fields list and types', async () => {

    component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.tableForeignKeys).toEqual(mockStructureForFilterDialog.foreignKeys);
    expect(component.fields).toEqual(['FirstName', 'Id', 'bool']);
    expect(component.tableRowStructure).toEqual({
      FirstName: fakeFirstName,
      Id: fakeId,
      bool: fakeBool
    });
  });

  it('should setup the initial state from search params', async () => {
    component.route.snapshot.queryParams = {
      f__FirstName__contain: 'nn'
    };

    component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.tableFilters).toEqual(['FirstName']);
    expect(component.tableRowFieldsShown).toEqual({
      FirstName: 'nn'
    });
    expect(component.tableRowFieldsComparator).toEqual({
      FirstName: 'contain'
    })
  });

  it('should setup the initial state from isSearched table settings', async () => {
    component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.tableFilters).toEqual(['bool']);
    expect(component.tableRowFieldsShown).toEqual({
      bool: undefined
    });
    expect(component.tableRowFieldsComparator).toEqual({
      bool: 'eq'
    })
  });

  it('should update a field in the model from ui component', () => {
    component.tableRowFieldsShown = { name: 'John' };
    component.updateField('new user name', 'name');

    expect(component.tableRowFieldsShown['name']).toEqual('new user name');
  })

  it('should reset filters', () => {
    component.tableFilters = ['FirstName', 'Id'];
    component.tableRowFieldsShown = {
      FirstName: 'John',
      Id: '111'
    }
    component.resetFilters();

    expect(component.tableFilters).toEqual([]);
    expect(component.tableRowFieldsShown).toEqual({});
  })

  it('should return number type of comparator select if data type is datetime', () => {
    const comparatorType = component.getComparatorType('datetime');
    expect(comparatorType).toEqual('number');
  })

  it('should return nonComparable type of comparator select if data type neither text nor number', () => {
    const comparatorType = component.getComparatorType(undefined);
    expect(comparatorType).toEqual('nonComparable');
  })
});
