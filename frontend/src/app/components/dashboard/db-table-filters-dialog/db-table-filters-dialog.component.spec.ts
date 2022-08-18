import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { ActivatedRoute } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DbTableFiltersDialogComponent } from './db-table-filters-dialog.component';
import { FormsModule }   from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from "@angular/router/testing";
import { TablesService } from 'src/app/services/tables.service';
import { of } from 'rxjs';

describe('DbTableFiltersDialogComponent', () => {
  let component: DbTableFiltersDialogComponent;
  let fixture: ComponentFixture<DbTableFiltersDialogComponent>;
  let tablesService: TablesService;

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
    "isSearched": false,
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
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
        { provide: ActivatedRoute, useValue: {
          queryParams: of({
            f__FirstName__contain: 'nn'
          }),
        }}
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DbTableFiltersDialogComponent);
    component = fixture.componentInstance;
    tablesService = TestBed.inject(TablesService);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should setup the initial state', async () => {
    spyOn(tablesService, 'fetchTableStructure').and.returnValue(of(mockTableStructure));

    component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();


    expect(component.tableForeignKeys).toEqual(mockTableStructure.foreignKeys);
    expect(component.fields).toEqual(['FirstName', 'Id', 'bool']);
    expect(component.tableTypes).toEqual({
      FirstName: 'varchar',
      Id: 'foreign key',
      bool: 'boolean'
    });
    expect(component.tableRowStructure).toEqual({
      FirstName: fakeFirstName,
      Id: fakeId,
      bool: fakeBool
    });
    expect(component.tableFilters).toEqual(['FirstName'])
    expect(component.tableRowFieldsShown).toEqual({
      FirstName: 'nn'
    });
    expect(component.tableRowFieldsComparator).toEqual({
      FirstName: 'contain'
    })
  });

  it('should get foreign key info by column name', () => {
    component.tableForeignKeys = mockTableStructure.foreignKeys;
    const relations = component.getRelations('Id');

    expect(relations).toEqual({
      "referenced_column_name": "CustomerId",
      "referenced_table_name": "Customers",
      "constraint_name": "Orders_ibfk_2",
      "column_name": "Id"
    })
  });

  it('should update a field in the model from ui component', () => {
    component.updateField('new user name', 'name');

    expect(component.tableRowFieldsShown['name']).toEqual('new user name');
  })

  it('should update filters and comparators objects with changing of filters list', () => {
    component.tableFilters = ['FirstName', 'Id'];
    component.tableRowFields = {
      FirstName: '',
      Id: '',
      bool: ''
    };
    component.tableRowFieldsShown = {
      FirstName: 'John'
    };
    component.tableRowFieldsComparator = {
      FirstName: 'startswith'
    };
    component. updateFilterFields();

    expect(component.tableRowFieldsShown).toEqual({
      FirstName: 'John',
      Id: undefined
    })

    expect(component.tableRowFieldsComparator).toEqual({
      FirstName: 'startswith',
      Id: 'eq'
    })
  })

  it('should update comparators object when field comparator is changed', () => {
    component.tableRowFieldsComparator = {
      FirstName: 'startswith',
      Id: 'eq'
    }
    component.updateComparator('lte', 'Id');

    expect(component.tableRowFieldsComparator).toEqual({
      FirstName: 'startswith',
      Id: 'lte'
    })
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
