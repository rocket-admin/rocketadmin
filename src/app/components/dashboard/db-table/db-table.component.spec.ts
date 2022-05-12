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

describe('DbTableComponent', () => {
  let component: DbTableComponent;
  let fixture: ComponentFixture<DbTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        MatMenuModule,
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        MatPaginatorModule,
        BrowserAnimationsModule,
        MatSortModule
      ],
      declarations: [ DbTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DbTableComponent);
    component = fixture.componentInstance;
    component.table = new TablesDataSource({} as any, {} as any, {} as any);
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
