import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { DbTableRowEditComponent } from './db-table-row-edit.component';
import { MatDialogModule } from '@angular/material/dialog';
import { TablesService } from 'src/app/services/tables.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { Angulartics2Module } from 'angulartics2';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('DbTableRowEditComponent', () => {
  let component: DbTableRowEditComponent;
  let fixture: ComponentFixture<DbTableRowEditComponent>;
  let tablesService: TablesService;
  let connectionsService: ConnectionsService;

  beforeEach(async () => {
    const matSnackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [
        MatSnackBarModule,
        MatDialogModule,
        Angulartics2Module.forRoot(),
        DbTableRowEditComponent
      ],
      providers:[
        provideHttpClient(),
        provideRouter([]),
        { provide: MatSnackBar, useValue: matSnackBarSpy }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DbTableRowEditComponent);
    component = fixture.componentInstance;
    tablesService = TestBed.inject(TablesService);
    connectionsService = TestBed.inject(ConnectionsService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set connection id', () => {
    spyOnProperty(connectionsService, 'currentConnectionID').and.returnValue('12345678');

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.connectionID).toEqual('12345678');
  });

  it('should set structure — define: relation between column name and type, required columns', async() => {
    component.tableForeignKeys = [
      {
        "referenced_column_name": "Id",
        "referenced_table_name": "Products",
        "constraint_name": "Orders_ibfk_1",
        "column_name": "ProductId"
      },
      {
        "referenced_column_name": "Id",
        "referenced_table_name": "Customers",
        "constraint_name": "Orders_ibfk_2",
        "column_name": "CustomerId"
      }
    ];

    const fakeProduct_categories = {
      "column_name": "product_categories",
      "column_default": null,
      "data_type": "enum",
      "data_type_params": [
        "food",
        "drinks",
        "cleaning"
      ],
      "isExcluded": false,
      "isSearched": false,
      "auto_increment": false,
      "allow_null": true,
      "character_maximum_length": 1
    }

    const fakeCustomer_categories = {
      "column_name": "customer_categories",
      "column_default": null,
      "data_type": "enum",
      "data_type_params": [
        "manager",
        "seller"
      ],
      "isExcluded": false,
      "isSearched": false,
      "auto_increment": false,
      "allow_null": true,
      "character_maximum_length": 1
    }

    const fakeCustomerId = {
      "column_name": "CustomerId",
      "column_default": null,
      "data_type": "int",
      "isExcluded": false,
      "isSearched": true,
      "auto_increment": false,
      "allow_null": false,
      "character_maximum_length": null
    }

    const fakeProductId = {
      "column_name": "ProductId",
      "column_default": null,
      "data_type": "int",
      "isExcluded": false,
      "isSearched": true,
      "auto_increment": false,
      "allow_null": false,
      "character_maximum_length": null
    }

    const fakeBool = {
      "column_name": "bool",
      "column_default": null,
      "data_type": "tinyint",
      "isExcluded": false,
      "isSearched": false,
      "auto_increment": false,
      "allow_null": true,
      "character_maximum_length": 1
    }

    const fakeFloat = {
      "column_name": "float",
      "column_default": null,
      "data_type": "float",
      "isExcluded": false,
      "isSearched": false,
      "auto_increment": false,
      "allow_null": true,
      "character_maximum_length": 102
    }

    const fakeStructure = [
      fakeProduct_categories,
      fakeCustomer_categories,
      fakeCustomerId,
      fakeProductId,
      fakeBool,
      fakeFloat,
    ]

    component.setRowStructure(fakeStructure);

    expect(component.tableRowRequiredValues).toEqual({
      product_categories: false,
      customer_categories: false,
      CustomerId: true,
      ProductId: true,
      bool: false,
      float: false
    });
    expect(component.tableRowStructure).toEqual({
      product_categories: fakeProduct_categories,
      customer_categories: fakeCustomer_categories,
      CustomerId: fakeCustomerId,
      ProductId: fakeProductId,
      bool: fakeBool,
      float: fakeFloat
    })
  })

  it('should set widgets', () => {
    const fakeWidgets = [
      {
        "id": "36141f10-feb6-4c42-acdb-261523729625",
        "field_name": "CustomerId",
        "widget_type": "Textarea",
        "widget_params": '',
        "name": "Customer",
        "description": ""
      },
      {
        "id": "d6a4caa5-68f6-455f-90ff-2ad81856253b",
        "field_name": "Price",
        "widget_type": "Number",
        "widget_params": '',
        "name": "",
        "description": "Prices are pointed in USD"
      }
    ]

    component.setWidgets(fakeWidgets);

    expect(component.tableWidgetsList).toEqual(['CustomerId', 'Price']);
    expect(component.tableWidgets).toEqual({
      CustomerId: {
        id: "36141f10-feb6-4c42-acdb-261523729625",
        field_name: "CustomerId",
        widget_type: "Textarea",
        widget_params: null,
        name: "Customer",
        description: ""
      },
      Price: {
        "id": "d6a4caa5-68f6-455f-90ff-2ad81856253b",
        "field_name": "Price",
        "widget_type": "Number",
        "widget_params": null,
        "name": "",
        "description": "Prices are pointed in USD"
      }
    });
  });

  it('should return foreign key relations by column name', () => {
    component.tableForeignKeys = [
      {
        "referenced_column_name": "Id",
        "referenced_table_name": "Products",
        "constraint_name": "Orders_ibfk_1",
        "column_name": "ProductId"
      },
      {
        "referenced_column_name": "Id",
        "referenced_table_name": "Customers",
        "constraint_name": "Orders_ibfk_2",
        "column_name": "CustomerId"
      }
    ];

    const foreignKeyRelations = component.getRelations('ProductId');
    expect(foreignKeyRelations).toEqual({
      "referenced_column_name": "Id",
      "referenced_table_name": "Products",
      "constraint_name": "Orders_ibfk_1",
      "column_name": "ProductId"
    })
  });

  it('should check if field is readonly', () => {
    component.readonlyFields = ['Id', 'Price'];

    const isPriceReafonly = component.isReadonlyField('Price');
    expect(isPriceReafonly).toBeTrue();
  });

  it('should check if field is widget', () => {
    component.tableWidgetsList = ['CustomerId', 'Price'];

    const isPriceWidget = component.isWidget('Price');
    expect(isPriceWidget).toBeTrue();
  });
});
