import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { ConnectionsService } from 'src/app/services/connections.service';
import { TablesService } from 'src/app/services/tables.service';

import { DbTableWidgetsComponent } from './db-table-widgets.component';
import { WidgetDeleteDialogComponent } from './widget-delete-dialog/widget-delete-dialog.component';

describe('DbTableWidgetsComponent', () => {
  let component: DbTableWidgetsComponent;
  let fixture: ComponentFixture<DbTableWidgetsComponent>;
  let tablesService: TablesService;
  let connectionsService: ConnectionsService;
  let dialog: MatDialog;
  let dialogRefSpyObj = jasmine.createSpyObj({ afterClosed : of({}), close: null });
  dialogRefSpyObj.componentInstance = { deleteWidget: of('user_name') };

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        MatDialogModule
      ],
      providers: [
        // { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
      ],
      declarations: [ DbTableWidgetsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DbTableWidgetsComponent);
    component = fixture.componentInstance;
    tablesService = TestBed.inject(TablesService);
    connectionsService = TestBed.inject(ConnectionsService);
    dialog = TestBed.get(MatDialog);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set connection id and table name', () => {
    spyOnProperty(connectionsService, 'currentConnectionID').and.returnValue('12345678');
    spyOnProperty(tablesService, 'currentTableName').and.returnValue('Users');
    spyOn(tablesService, 'fetchTableStructure').and.returnValue(of(mockTableStructure));
    spyOn(tablesService, 'fetchTableWidgets').and.returnValue(of(tableWidgetsNetwork));

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.connectionID).toEqual('12345678');
    expect(component.tableName).toEqual('Users');
    expect(component.fields).toEqual(['FirstName', 'Id', 'bool']);
    expect(component.widgets).toEqual(tableWidgetsNetwork);
  });

  it('should add new empty widget to widgets array', () => {
    component.widgets = [
      {
        field_name: 'user_id',
        widget_type: 'textarea',
        widget_params: {},
        name: '',
        description: ''
      }
    ];

    component.addNewWidget();

    expect(component.widgets).toEqual([
      {
        field_name: 'user_id',
        widget_type: 'textarea',
        widget_params: {},
        name: '',
        description: ''
      },
      {
        field_name: '',
        widget_type: '',
        widget_params: {},
        name: '',
        description: ''
      }
    ])
  });

  it('should exclude field from lields list when it is added the list of widgets', () => {
    component.fields = ['user_id', 'first_name', 'last_name', 'email'];
    component.selectWidgetField('first_name');

    expect(component.fields).toEqual(['user_id', 'last_name', 'email']);
  });

  it('should set empty string in widget_type if widget does not need another appearance', () => {
    component.widgets = [
      {
        field_name: 'user_id',
        widget_type: 'textarea',
        widget_params: {},
        name: '',
        description: ''
      },
      {
        field_name: 'user_name',
        widget_type: 'Default',
        widget_params: {},
        name: 'name',
        description: ''
      }
    ];

    component.onWidgetTypeChange('user_name');

    expect(component.widgets).toEqual([
      {
        field_name: 'user_id',
        widget_type: 'textarea',
        widget_params: {},
        name: '',
        description: ''
      },
      {
        field_name: 'user_name',
        widget_type: '',
        widget_params: {},
        name: 'name',
        description: ''
      }
    ])
  });

  it('should update widget params on json editor change', () => {
    component.widgets = [
      {
        field_name: 'user_id',
        widget_type: 'textarea',
        widget_params: {},
        name: '',
        description: ''
      },
      {
        field_name: 'user_name',
        widget_type: 'string',
        widget_params: {},
        name: 'name',
        description: ''
      }
    ];

    component.onWidgetParamsChange({encription: true}, 'user_name');

    expect(component.widgets).toEqual([
      {
        field_name: 'user_id',
        widget_type: 'textarea',
        widget_params: {},
        name: '',
        description: ''
      },
      {
        field_name: 'user_name',
        widget_type: 'string',
        widget_params: {encription: true},
        name: 'name',
        description: ''
      }
    ])
  });

  it('should open dialog to confirm deletion of widget', () => {
    component.fields = ['user_age'];
    component.widgets = [
      {
        field_name: 'user_id',
        widget_type: 'textarea',
        widget_params: {},
        name: '',
        description: ''
      },
      {
        field_name: 'user_name',
        widget_type: 'Default',
        widget_params: {},
        name: 'name',
        description: ''
      }
    ];

    const fakeDialog = spyOn(dialog, 'open').and.returnValue(dialogRefSpyObj);
    component.openDeleteWidgetDialog('user_name');

    expect(component.isAllWidgetsDeleted).toBeFalse();
    expect(component.fields).toEqual(['user_age', 'user_name']);
    expect(component.widgets).toEqual([
      {
        field_name: 'user_id',
        widget_type: 'textarea',
        widget_params: {},
        name: '',
        description: ''
      }
    ]);

    expect(fakeDialog).toHaveBeenCalledOnceWith(WidgetDeleteDialogComponent, {
          width: '25em',
          data: 'user_name'
        });
    });

    it('should update widgets', () => {
      component.connectionID = '12345678';
      component.tableName = 'users';
      component.widgets = [
        {
          field_name: "email",
          widget_type: "Textarea",
          widget_params: {},
          name: "user email",
          description: ""
        }
      ];
      spyOn(tablesService, 'updateTableWidgets').and.returnValue(of(tableWidgetsNetwork));

      component.updateWidgets();

      expect(component.widgets).toEqual(tableWidgetsNetwork);
      expect(component.submitting).toBeFalse();
      expect(component.isAllWidgetsDeleted).toBeFalse();
    });
});
