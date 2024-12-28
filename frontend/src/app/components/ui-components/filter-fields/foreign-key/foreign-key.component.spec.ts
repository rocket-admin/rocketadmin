import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForeignKeyFilterComponent } from './foreign-key.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from "@angular/router/testing";
import { TablesService } from 'src/app/services/tables.service';
import { of } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';

xdescribe('ForeignKeyFilterComponent', () => {
  let component: ForeignKeyFilterComponent;
  let fixture: ComponentFixture<ForeignKeyFilterComponent>;
  let tablesService: TablesService;

  const structureNetwork = [
    {
      "column_name": "id",
      "column_default": "nextval('customers_id_seq'::regclass)",
      "data_type": "integer",
      "isExcluded": false,
      "isSearched": false,
      "auto_increment": true,
      "allow_null": false,
      "character_maximum_length": null
    },
    {
      "column_name": "firstname",
      "column_default": null,
      "data_type": "character varying",
      "isExcluded": false,
      "isSearched": false,
      "auto_increment": false,
      "allow_null": true,
      "character_maximum_length": 30
    },
    {
      "column_name": "lastname",
      "column_default": null,
      "data_type": "character varying",
      "isExcluded": false,
      "isSearched": false,
      "auto_increment": false,
      "allow_null": true,
      "character_maximum_length": 30
    },
    {
      "column_name": "email",
      "column_default": null,
      "data_type": "character varying",
      "isExcluded": false,
      "isSearched": false,
      "auto_increment": false,
      "allow_null": false,
      "character_maximum_length": 30
    },
    {
      "column_name": "age",
      "column_default": null,
      "data_type": "integer",
      "isExcluded": false,
      "isSearched": false,
      "auto_increment": false,
      "allow_null": true,
      "character_maximum_length": null
    }
  ]

  const usersTableNetwork = {
    "rows": [
      {
        "id": 33,
        "firstname": "Alex",
        "lastname": "Taylor",
        "email": "new-user-5@email.com",
        "age": 24
      },
      {
        "id": 34,
        "firstname": "Alex",
        "lastname": "Johnson",
        "email": "new-user-4@email.com",
        "age": 24
      },
      {
        "id": 35,
        "firstname": "Alex",
        "lastname": "Smith",
        "email": "some-new@email.com",
        "age": 24
      }
    ],
    "primaryColumns": [
      {
        "column_name": "id",
        "data_type": "integer"
      }
    ],
    "pagination": {
      "total": 30,
      "lastPage": 1,
      "perPage": 30,
      "currentPage": 1
    },
    "sortable_by": [],
    "ordering": "ASC",
    "structure": structureNetwork,
    "foreignKeys": []
  }

  const fakeRelations = {
      autocomplete_columns: ['firstname', 'lastname', 'email'],
      column_name: 'userId',
      constraint_name: '',
      referenced_column_name: 'id',
      referenced_table_name: 'users',
      column_default: '',
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        MatAutocompleteModule,
        MatDialogModule,
        ForeignKeyFilterComponent,
        BrowserAnimationsModule
      ],
      providers: [provideHttpClient()]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ForeignKeyFilterComponent);
    component = fixture.componentInstance;
    component.relations = fakeRelations;
    tablesService = TestBed.inject(TablesService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fill initial dropdown values when identity_column is set', () => {
    const usersTableNetworkWithIdentityColumn = {...usersTableNetwork, identity_column: 'lastname'}

    spyOn(tablesService, 'fetchTable').and.returnValue(of(usersTableNetworkWithIdentityColumn));

    component.connectionID = '12345678';
    component.value = '';

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.identityColumn).toEqual('lastname');
    expect(component.currentDisplayedString).toEqual('Taylor (Alex | new-user-5@email.com)');
    expect(component.currentFieldValue).toEqual(33);

    expect(component.suggestions).toEqual([
      {
        displayString: 'Taylor (Alex | new-user-5@email.com)',
        primaryKeys: {id: 33},
        fieldValue: 33
      },
      {
        displayString: 'Johnson (Alex | new-user-4@email.com)',
        primaryKeys: {id: 34},
        fieldValue: 34
      },
      {
        displayString: 'Smith (Alex | some-new@email.com)',
        primaryKeys: {id: 35},
        fieldValue: 35
      }
    ])
  });

  it('should fill initial dropdown values when identity_column is not set', () => {
    spyOn(tablesService, 'fetchTable').and.returnValue(of(usersTableNetwork));

    component.connectionID = '12345678';

    component.value = '';

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.identityColumn).toBeUndefined;
    expect(component.currentDisplayedString).toEqual('Alex | Taylor | new-user-5@email.com');
    expect(component.currentFieldValue).toEqual(33);

    expect(component.suggestions).toEqual([
      {
        displayString: 'Alex | Taylor | new-user-5@email.com',
        primaryKeys: {id: 33},
        fieldValue: 33
      },
      {
        displayString: 'Alex | Johnson | new-user-4@email.com',
        primaryKeys: {id: 34},
        fieldValue: 34
      },
      {
        displayString: 'Alex | Smith | some-new@email.com',
        primaryKeys: {id: 35},
        fieldValue: 35
      }
    ])
  });

  it('should fill initial dropdown values when autocomplete_columns is not set', () => {
    spyOn(tablesService, 'fetchTable').and.returnValue(of(usersTableNetwork));

    component.connectionID = '12345678';
    component.relations = {
      autocomplete_columns: [],
      column_name: 'userId',
      constraint_name: '',
      referenced_column_name: 'id',
      referenced_table_name: 'users',
      column_default: '',
    };
    component.value = '';

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.identityColumn).toBeUndefined;
    expect(component.currentDisplayedString).toEqual('33 | Alex | Taylor | new-user-5@email.com | 24');
    expect(component.currentFieldValue).toEqual(33);

    expect(component.suggestions).toEqual([
      {
        displayString: '33 | Alex | Taylor | new-user-5@email.com | 24',
        primaryKeys: {id: 33},
        fieldValue: 33
      },
      {
        displayString: '34 | Alex | Johnson | new-user-4@email.com | 24',
        primaryKeys: {id: 34},
        fieldValue: 34
      },
      {
        displayString: '35 | Alex | Smith | some-new@email.com | 24',
        primaryKeys: {id: 35},
        fieldValue: 35
      }
    ])
  });

  it('should set current value if necessary row is in suggestions list', () => {
    component.suggestions = [
      {
        displayString: 'Alex | Taylor | new-user-5@email.com',
        primaryKeys: {id: 33},
        fieldValue: 33
      },
      {
        displayString: 'Alex | Johnson | new-user-4@email.com',
        primaryKeys: {id: 34},
        fieldValue: 34
      },
      {
        displayString: 'Alex | Smith | some-new@email.com',
        primaryKeys: {id: 35},
        fieldValue: 35
      }
    ];
    component.currentDisplayedString = 'Alex | Johnson | new-user-4@email.com';

    component.fetchSuggestions();

    expect(component.currentFieldValue).toEqual(34);
  });

  it('should fetch suggestions list if user types search query and identity column is set', () => {
    const searchSuggestionsNetwork = {
      rows: [
        {
          "id": 23,
          "firstname": "John",
          "lastname": "Taylor",
          "email": "new-user-0@email.com",
          "age": 24
        },
        {
          "id": 24,
          "firstname": "John",
          "lastname": "Johnson",
          "email": "new-user-1@email.com",
          "age": 24
        }
      ],
      primaryColumns: [{ column_name: "id", data_type: "integer" }],
      identity_column: 'lastname'
    }

    spyOn(tablesService, 'fetchTable').and.returnValue(of(searchSuggestionsNetwork));

    component.relations = fakeRelations;

    component.suggestions = [
      {
        displayString: 'Alex | Taylor | new-user-5@email.com',
        fieldValue: 33
      },
      {
        displayString: 'Alex | Johnson | new-user-4@email.com',
        fieldValue: 34
      },
      {
        displayString: 'Alex | Smith | some-new@email.com',
        fieldValue: 35
      }
    ];

    component.currentDisplayedString = 'John';
    component.fetchSuggestions();

    expect(component.suggestions).toEqual([
      {
        displayString: 'Taylor (John | new-user-0@email.com)',
        primaryKeys: {id: 23},
        fieldValue: 23
      },
      {
        displayString: 'Johnson (John | new-user-1@email.com)',
        primaryKeys: {id: 24},
        fieldValue: 24
      }
    ])
  });

  it('should fetch suggestions list if user types search query and show No matches message if the list is empty', () => {
    const searchSuggestionsNetwork = {
      rows: []
    }

    spyOn(tablesService, 'fetchTable').and.returnValue(of(searchSuggestionsNetwork));

    component.suggestions = [
      {
        displayString: 'Alex | Taylor | new-user-5@email.com',
        primaryKeys : {id: 33},
        fieldValue: 33
      },
      {
        displayString: 'Alex | Johnson | new-user-4@email.com',
        primaryKeys : {id: 34},
        fieldValue: 34
      },
      {
        displayString: 'Alex | Smith | some-new@email.com',
        primaryKeys : {id: 35},
        fieldValue: 35
      }
    ];

    component.currentDisplayedString = 'skjfhskjdf';
    component.fetchSuggestions();

    expect(component.suggestions).toEqual([
      {
        displayString: 'No matches',
      }
    ])
  })

  it('should fetch suggestions list if user types search query and identity column is not set', () => {
    const searchSuggestionsNetwork = {
      rows: [
        {
          "id": 23,
          "firstname": "John",
          "lastname": "Taylor",
          "email": "new-user-0@email.com",
          "age": 24
        },
        {
          "id": 24,
          "firstname": "John",
          "lastname": "Johnson",
          "email": "new-user-1@email.com",
          "age": 24
        }
      ],
      primaryColumns: [{ column_name: "id", data_type: "integer" }]
    }

    const fakeFetchTable = spyOn(tablesService, 'fetchTable').and.returnValue(of(searchSuggestionsNetwork));
    component.connectionID = '12345678';
    component.relations = fakeRelations;

    component.suggestions = [
      {
        displayString: 'Alex | Taylor | new-user-5@email.com',
        fieldValue: 33
      },
      {
        displayString: 'Alex | Johnson | new-user-4@email.com',
        fieldValue: 34
      },
      {
        displayString: 'Alex | Smith | some-new@email.com',
        fieldValue: 35
      }
    ];

    component.currentDisplayedString = 'Alex';
    console.log('my test');
    component.fetchSuggestions();

    fixture.detectChanges();

    expect(fakeFetchTable).toHaveBeenCalledWith({connectionID: '12345678',
      tableName: component.relations.referenced_table_name,
      requstedPage: 1,
      chunkSize: 20,
      foreignKeyRowName: 'autocomplete',
      foreignKeyRowValue: component.currentDisplayedString,
      referencedColumn: component.relations.referenced_column_name});

    expect(component.suggestions).toEqual([
      {
        displayString: 'John | Taylor | new-user-0@email.com',
        primaryKeys : {id: 23},
        fieldValue: 23
      },
      {
        displayString: 'John | Johnson | new-user-1@email.com',
        primaryKeys : {id: 24},
        fieldValue: 24
      }
    ])
  })
});
