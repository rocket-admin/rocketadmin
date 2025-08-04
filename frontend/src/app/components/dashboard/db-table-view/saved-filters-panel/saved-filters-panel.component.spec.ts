import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatDialog } from '@angular/material/dialog';
import { SavedFiltersPanelComponent } from './saved-filters-panel.component';
import { TablesService } from 'src/app/services/tables.service';
import { of } from 'rxjs';

describe('SavedFiltersPanelComponent', () => {
  let component: SavedFiltersPanelComponent;
  let fixture: ComponentFixture<SavedFiltersPanelComponent>;
  let tablesServiceSpy: jasmine.SpyObj<TablesService>;
  let routerSpy: jasmine.SpyObj<Router>;

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
    const tablesServiceMock = jasmine.createSpyObj('TablesService', ['getSavedFilters', 'createSavedFilter']);
    tablesServiceMock.getSavedFilters.and.returnValue(of([mockFilter]));
    tablesServiceMock.cast = of({});
    
    const routerMock = jasmine.createSpyObj('Router', ['navigate']);
    
    const activatedRouteMock = {
      queryParams: of({}),
      snapshot: {
        queryParams: {}
      }
    };

    const matDialogMock = jasmine.createSpyObj('MatDialog', ['open']);
    
    await TestBed.configureTestingModule({
      imports: [SavedFiltersPanelComponent],
      providers: [
        { provide: TablesService, useValue: tablesServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: MatDialog, useValue: matDialogMock }
      ]
    }).compileComponents();

    tablesServiceSpy = TestBed.inject(TablesService) as jasmine.SpyObj<TablesService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    
    fixture = TestBed.createComponent(SavedFiltersPanelComponent);
    component = fixture.componentInstance;
    component.connectionID = 'conn1';
    component.selectedTableName = 'users';
    component.structure = [];
    component.tableTypes = {};
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
    component.selectedFilterSetId = 'filter1';
    component.savedFilterMap = {
      filter1: {
        dynamicColumn: { column: 'city', operator: 'eq', value: 'New York' }
      }
    };
    
    component.updateDynamicColumnComparator('empty');
    
    expect(component.savedFilterMap.filter1.dynamicColumn.value).toBe('');
  });
  
  it('should update dynamic column value', () => {
    component.selectedFilterSetId = 'filter1';
    component.savedFilterMap = {
      filter1: {
        dynamicColumn: { column: 'city', operator: 'eq', value: 'New York' }
      }
    };
    
    component.updateDynamicColumnValue('Chicago');
    
    expect(component.savedFilterMap.filter1.dynamicColumn.value).toBe('Chicago');
  });
});
