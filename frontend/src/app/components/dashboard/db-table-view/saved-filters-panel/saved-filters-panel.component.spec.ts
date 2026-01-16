import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Angulartics2Module } from 'angulartics2';
import { ConnectionsService } from 'src/app/services/connections.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { SavedFiltersPanelComponent } from './saved-filters-panel.component';
import { TablesService } from 'src/app/services/tables.service';
import { of } from 'rxjs';

// We need to mock the JsonURL import used in the component
jasmine.getEnv().allowRespy(true); // Allow respying on the same object
class JsonURLMock {
  static stringify(obj: any): string {
    return JSON.stringify(obj);
  }

  static parse(str: string): any {
    try {
      return JSON.parse(str);
    } catch (_e) {
      return {};
    }
  }
}

// Add to global scope to be used by the component
(window as any).JsonURL = JsonURLMock;

describe('SavedFiltersPanelComponent', () => {
  let component: SavedFiltersPanelComponent;
  let fixture: ComponentFixture<SavedFiltersPanelComponent>;
  let _tablesServiceSpy: jasmine.SpyObj<TablesService>;
  let _routerSpy: jasmine.SpyObj<Router>;

  const mockFilter = {
    id: 'filter1',
    name: 'Test Filter',
    filters: {
      name: { eq: 'John' },
      age: { gt: 25 }
    },
    dynamic_column: {
      column_name: 'city',
      comparator: 'eq'
    }
  };

  beforeEach(async () => {
    const tablesServiceMock = {
      getSavedFilters: vi.fn().mockReturnValue(of([mockFilter])),
      createSavedFilter: vi.fn(),
      cast: of({}),
    };

    const routerMock = {
      navigate: vi.fn(),
    };

    const activatedRouteMock = {
      queryParams: of({}),
      paramMap: of(convertToParamMap({})),
      queryParamMap: of(convertToParamMap({})),
      snapshot: {
        queryParams: {},
        paramMap: {
          get: (_key: string) => null
        },
        queryParamMap: {
          get: (_key: string) => null
        }
      }
    };

    const matDialogMock = {
      open: vi.fn(),
    };

    const connectionsServiceMock = {
      get currentConnection() { return { type: 'postgres' }; }
    };

    await TestBed.configureTestingModule({
      imports: [
        SavedFiltersPanelComponent,
        HttpClientTestingModule,
        Angulartics2Module.forRoot(),
      ],
      providers: [
        { provide: TablesService, useValue: tablesServiceMock },
        { provide: ConnectionsService, useValue: connectionsServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: MatDialog, useValue: matDialogMock }
      ]
    }).compileComponents();

    _tablesServiceSpy = TestBed.inject(TablesService) as jasmine.SpyObj<TablesService>;
    _routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    fixture = TestBed.createComponent(SavedFiltersPanelComponent);
    component = fixture.componentInstance;
    component.connectionID = 'conn1';
    component.selectedTableName = 'users';
    component.structure = [];
    component.tableTypes = {};
    component.selectedTableDisplayName = 'Users';
    component.tableForeignKeys = [];

    // Mock filterSelected event emitter
    vi.spyOn(component.filterSelected, 'emit');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should process filters data to separate static filters and dynamic column', () => {
    const result = component.processFiltersData(mockFilter);

    expect(result.dynamicColumn).toBeTruthy();
    expect(result.dynamicColumn?.column).toBe('city');
    expect(result.dynamicColumn?.operator).toBe('eq');

    expect(result.staticFilters.length).toBe(2);
    expect(result.staticFilters[0].column).toBe('name');
    expect(result.staticFilters[1].column).toBe('age');
  });

  it('should update dynamic column comparator', () => {
    component.selectedFilterSetId = 'filter1';
    component.savedFilterMap = {
      filter1: {
        dynamicColumn: { column: 'city', operator: 'eq', value: 'New York' }
      }
    };

    component.updateDynamicColumnComparator('contains');

    expect(component.savedFilterMap.filter1.dynamicColumn.operator).toBe('contains');
  });

  it('should set value to empty string when comparator is empty', () => {
    // Setup component with the minimal required properties
    component.selectedFilterSetId = 'filter1';
    component.savedFilterMap = {
      filter1: {
        dynamicColumn: { column: 'city', operator: 'eq', value: 'New York' },
        filters: { city: { eq: 'New York' } }
      }
    };

    // Spy on applyDynamicColumnChanges to prevent it from executing
    vi.spyOn(component, 'applyDynamicColumnChanges');

    // Call the method under test
    component.updateDynamicColumnComparator('empty');

    // Verify the value was set to empty string
    expect(component.savedFilterMap.filter1.dynamicColumn.value).toBe('');
  });

  it('should update dynamic column value', () => {
    // Setup component with the minimal required properties
    component.selectedFilterSetId = 'filter1';
    component.savedFilterMap = {
      filter1: {
        dynamicColumn: { column: 'city', operator: 'eq', value: 'New York' },
        filters: { city: { eq: 'New York' } }
      }
    };

    // Spy on applyDynamicColumnChanges to prevent it from executing
    vi.spyOn(component, 'applyDynamicColumnChanges');

    // Replace setTimeout with a function that executes immediately
    vi.spyOn(window, 'setTimeout').mockImplementation((fn: TimerHandler) => {
      // Execute function immediately instead of waiting
      if (typeof fn === 'function') fn();
      // Return a fake timer ID
      return 999 as unknown as ReturnType<typeof setTimeout>;
    });

    // Call the method under test
    component.updateDynamicColumnValue('Chicago');

    // Verify the value was updated
    expect(component.savedFilterMap.filter1.dynamicColumn.value).toBe('Chicago');
    expect(component.applyDynamicColumnChanges).toHaveBeenCalled();
  });
});
