import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DbTableComponent } from './db-table.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { RouterTestingModule } from "@angular/router/testing";
import { TablesDataSource } from '../db-tables-data-source';
import { CustomActionType } from 'src/app/models/table';
import { SelectionModel } from '@angular/cdk/collections';
import { FormsModule } from '@angular/forms';

describe('DbTableComponent', () => {
  let component: DbTableComponent;
  let fixture: ComponentFixture<DbTableComponent>;

  const mockWidgets = {
    "Region": {
      "id": "c768dde8-7348-46e8-a522-718a29b705e8",
      "field_name": "Region",
      "widget_type": "Select",
      "widget_params": "// provide array of options to map database value (key 'value') in human readable value (key 'label');\n// for example:\n// AK => Alaska,\n// CA => California\n\n{\n  options: [\n    {\n      value: 'AK',\n      label: 'Alaska'\n    },\n    {\n      value: 'CA',\n      label: 'California'\n    }\n  ]\n}",
      "widget_options": null,
      "name": "State",
      "description": ""
    },
    "address_id": {
      "id": "ee3125ca-86cc-4c20-93f9-8a0b2c43d61f",
      "field_name": "address_id",
      "widget_type": "String",
      "widget_params": "// No settings required",
      "widget_options": null,
      "name": "",
      "description": ""
    }
  }

  const mockSelectOption = {
    "Region": [
      {
        "value": "AK",
        "label": "Alaska"
      },
      {
        "value": "CA",
        "label": "California"
      }
    ]
  }

  const mockFilterComparators = {
    "first_name": "startswith",
    "second_name": "endswith",
    "email": "contains",
    "age": "gt"
  }

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        MatMenuModule,
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        MatPaginatorModule,
        BrowserAnimationsModule,
        MatSortModule,
        FormsModule
      ],
      declarations: [ DbTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DbTableComponent);
    component = fixture.componentInstance;
    component.table = new TablesDataSource({} as any, {} as any, {} as any);
    component.selection = new SelectionModel<any>(true, []);
    component.filterComparators = mockFilterComparators;
    fixture.autoDetectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should check if column is foreign key', () => {
    component.tableData.foreignKeysList = ['ProductId', 'CustomerId'];
    const isForeignKeyResult = component.isForeignKey('ProductId')
    expect(isForeignKeyResult).toBeTrue();
  });

  it('should return query params for link for foreign key', () => {
    const foreignKey = {
      autocomplete_columns: [ "FirstName" ],
      column_name: "CustomerId",
      column_default:	null,
      constraint_name: "Orders_ibfk_2",
      referenced_column_name: "Id",
      referenced_table_name: "Customers"
    };

    const cell = {
      Id: 42
    };

    const queryParams = component.getForeignKeyQueryParams(foreignKey, cell)
    expect(queryParams).toEqual({ Id: 42 });
  });

  it('should check if it is widget by column name', () => {
    component.tableData.widgetsList = ['Name', 'Age'];

    const isWigetAge = component.isWidget('Age');

    expect(isWigetAge).toBeTrue();
  });

  it('should return label from id for Select widget', () => {
    component.tableData.widgets = mockWidgets;
    component.tableData.selectWidgetsOptions = mockSelectOption;

    const selectDisplayedValue = component.getWidgetValue('Region', 'CA');

    expect(selectDisplayedValue).toEqual('California');
  });

  it('should return value if widget is not Select', () => {
    component.tableData.widgets = mockWidgets;
    component.tableData.selectWidgetsOptions = mockSelectOption;

    const selectDisplayedValue = component.getWidgetValue('address_id', '0987654321');

    expect(selectDisplayedValue).toEqual('0987654321');
  });

  it('should return 2 for active filters with object of two fileds', () => {
    const numberOfFilters = component.getFiltersCount({ "Country": "С", "Name": "John"})

    expect(numberOfFilters).toEqual(2);
  });

  it('should emit open filters actions to parent', () => {
    const mockStructure = [{
      "column_name": "first_name",
      "column_default": null,
      "data_type": "character varying",
      "isExcluded": false,
      "isSearched": false,
      "auto_increment": false,
      "allow_null": true,
      "character_maximum_length": 45
    }];
    const mockForeignKeysList = [];
    const mockForeignKeys = {};
    const mockWidgets = [];
    component.tableData.structure = mockStructure;
    component.tableData.foreignKeysList = mockForeignKeysList;
    component.tableData.foreignKeys = mockForeignKeys;
    component.tableData.widgets = mockWidgets;
    spyOn(component.openFilters, 'emit');

    component.handleOpenFilters();

    expect(component.openFilters.emit).toHaveBeenCalledWith({
      structure: mockStructure,
      foreignKeysList: mockForeignKeysList,
      foreignKeys: mockForeignKeys,
      widgets: mockWidgets
    });
    expect(component.searchString).toEqual('');
  });

  it('should clear search string and emit search by string to parent', () => {
    spyOn(component.search, 'emit');

    component.clearSearch();

    expect(component.searchString).toBeNull();
    expect(component.search.emit).toHaveBeenCalledWith(null);
  });

  it('should return filter chip label for starts with comparator', () => {
    const chipFilterLable = component.getFilter('first_name', 'A');

    expect(chipFilterLable).toEqual('First Names = A...');
  });

  it('should return filter chip label for ends with comparator', () => {
    const chipFilterLable = component.getFilter('second_name', 'y');

    expect(chipFilterLable).toEqual('Second Names = ...y');
  });

  it('should return filter chip label for contains comparator', () => {
    const chipFilterLable = component.getFilter('email', 'gmail');

    expect(chipFilterLable).toEqual('Emails = ...gmail...');
  });

  it('should return filter chip label for greater than comparator', () => {
    const chipFilterLable = component.getFilter('age', '20');

    expect(chipFilterLable).toEqual('Ages > 20');
  });

  it('should return human readable value of foreign key if identitty field was not pointed', () => {
    const foreignKey = {
      autocomplete_columns: [ "FirstName" ],
      column_name: "CustomerId",
      column_default:	null,
      constraint_name: "Orders_ibfk_2",
      referenced_column_name: "Id",
      referenced_table_name: "Customers"
    };

    const cell = {
      Id: 42
    };

    const value = component.getCellValue(foreignKey, cell)
    expect(value).toEqual( 42 );
  });

  it('should return human readable value of foreign key if identity field was pointed', () => {
    const foreignKey = {
      autocomplete_columns: [ "FirstName" ],
      column_name: "CustomerId",
      column_default:	null,
      constraint_name: "Orders_ibfk_2",
      referenced_column_name: "Id",
      referenced_table_name: "Customers"
    };

    const cell = {
      Id: 42,
      name: 'John'
    };

    const value = component.getCellValue(foreignKey, cell)
    expect(value).toEqual( 'John' );
  });
});
