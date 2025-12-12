import { ActivatedRoute, RouterModule } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ConnectionsService } from 'src/app/services/connections.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';
import { SavedFiltersDialogComponent } from './saved-filters-dialog.component';
import { TablesService } from 'src/app/services/tables.service';
import { of } from 'rxjs';
import { Angulartics2Module } from 'angulartics2';

describe('SavedFiltersDialogComponent', () => {
  let component: SavedFiltersDialogComponent;
  let fixture: ComponentFixture<SavedFiltersDialogComponent>;
  let tablesServiceMock: jasmine.SpyObj<TablesService>;
  let connectionsServiceMock: jasmine.SpyObj<ConnectionsService>;

  beforeEach(async () => {
    const tableSpy = jasmine.createSpyObj('TablesService', ['cast', 'createSavedFilter', 'deleteSavedFilter', 'updateSavedFilter']);
    tableSpy.cast = jasmine.createSpyObj('BehaviorSubject', ['subscribe']);

    const connectionSpy = jasmine.createSpyObj('ConnectionsService', [], {
      currentConnection: { type: 'postgres' }
    });

    await TestBed.configureTestingModule({
      imports: [
        SavedFiltersDialogComponent,
        RouterTestingModule,
        Angulartics2Module.forRoot(),
      ],
      providers: [
        { provide: TablesService, useValue: tableSpy },
        { provide: ConnectionsService, useValue: connectionSpy },
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
        { provide: MatSnackBar, useValue: { open: jasmine.createSpy('open') } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => {} },
              queryParamMap: { get: () => {} }
            }
          }
        },
        { provide: MAT_DIALOG_DATA, useValue: {
          connectionID: '123',
          tableName: 'test_table',
          displayTableName: 'Test Table',
          filtersSet: {
            name: 'Test Filter',
            filters: {}
          },
          structure: [],
          tableForeignKeys: {},
          tableWidgets: []
        }}
      ]
    })
    .compileComponents();

    tablesServiceMock = TestBed.inject(TablesService) as jasmine.SpyObj<TablesService>;
    connectionsServiceMock = TestBed.inject(ConnectionsService) as jasmine.SpyObj<ConnectionsService>;

    fixture = TestBed.createComponent(SavedFiltersDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle dynamic column', () => {
    const fieldName = 'test_field';

    // Initially null
    expect(component.dynamicColumn).toBeNull();

    // First toggle sets to fieldName
    component.toggleDynamicColumn(fieldName);
    expect(component.dynamicColumn).toBe(fieldName);

    // Second toggle sets back to null
    component.toggleDynamicColumn(fieldName);
    expect(component.dynamicColumn).toBeNull();
  });

  it('should exclude dynamic column from filters and include it with column_name and comparator', () => {
    // Setup
    const fieldName = 'test_field';
    component.tableRowFieldsShown = { [fieldName]: 'test_value' };
    component.tableRowFieldsComparator = { [fieldName]: 'eq' };
    component.dynamicColumn = fieldName;
    tablesServiceMock.createSavedFilter.and.returnValue(of({}));

    // Call handleSaveFilters
    component.handleSaveFilters();

    // Verify - filters should be empty, and dynamic_column should have column_name and comparator
    expect(tablesServiceMock.createSavedFilter).toHaveBeenCalledWith(
      component.data.connectionID,
      component.data.tableName,
      {
        name: component.data.filtersSet.name,
        filters: { },
        dynamic_column: {
          column_name: fieldName,
          comparator: 'eq'
        }
      }
    );
  });

  it('should include dynamic column with column_name and comparator and exclude it from filters', () => {
    // Setup
    const fieldName = 'test_field';
    const dynamicFieldName = 'dynamic_field';
    component.tableRowFieldsShown = {
      [fieldName]: 'test_value',
      [dynamicFieldName]: 'dynamic_value'
    };
    component.tableRowFieldsComparator = {
      [fieldName]: 'eq',
      [dynamicFieldName]: 'contains'
    };
    component.dynamicColumn = dynamicFieldName; // Different field from the one with comparator
    tablesServiceMock.createSavedFilter.and.returnValue(of({}));

    // Call handleSaveFilters
    component.handleSaveFilters();

    // Verify - only fieldName in filters, dynamicFieldName in dynamic_column
    expect(tablesServiceMock.createSavedFilter).toHaveBeenCalledWith(
      component.data.connectionID,
      component.data.tableName,
      {
        name: component.data.filtersSet.name,
        filters: { [fieldName]: { eq: 'test_value' } },
        dynamic_column: {
          column_name: dynamicFieldName,
          comparator: 'contains'
        }
      }
    );
  });

  it('should handle empty values in filters as null', () => {
    // Setup
    const fieldName = 'test_field';
    component.tableRowFieldsShown = { [fieldName]: '' }; // Empty value
    component.tableRowFieldsComparator = { [fieldName]: 'eq' };
    tablesServiceMock.createSavedFilter.and.returnValue(of({}));

    // Call handleSaveFilters
    component.handleSaveFilters();

    // Verify - value should be null instead of empty string
    expect(tablesServiceMock.createSavedFilter).toHaveBeenCalledWith(
      component.data.connectionID,
      component.data.tableName,
      {
        name: component.data.filtersSet.name,
        filters: { [fieldName]: { eq: null } }
      }
    );
  });

  it('should handle dynamic column with no comparator', () => {
    // Setup
    const fieldName = 'test_field';
    const dynamicFieldName = 'dynamic_field_no_comparator';
    component.tableRowFieldsShown = {
      [fieldName]: 'test_value',
      [dynamicFieldName]: 'dynamic_value'
    };
    component.tableRowFieldsComparator = {
      [fieldName]: 'eq'
      // No comparator for dynamicFieldName
    };
    component.dynamicColumn = dynamicFieldName;
    tablesServiceMock.createSavedFilter.and.returnValue(of({}));

    // Call handleSaveFilters
    component.handleSaveFilters();

    // Verify - dynamic_column should have empty comparator
    expect(tablesServiceMock.createSavedFilter).toHaveBeenCalledWith(
      component.data.connectionID,
      component.data.tableName,
      {
        name: component.data.filtersSet.name,
        filters: { [fieldName]: { eq: 'test_value' } },
        dynamic_column: {
          column_name: dynamicFieldName,
          comparator: ''
        }
      }
    );
  });

  it('should update existing filter when id is present', () => {
    // Setup
    const fieldName = 'test_field';
    const filterId = '123';
    component.tableRowFieldsShown = { [fieldName]: 'test_value' };
    component.tableRowFieldsComparator = { [fieldName]: 'eq' };
    component.data.filtersSet.id = filterId;
    tablesServiceMock.updateSavedFilter.and.returnValue(of({}));

    // Call handleSaveFilters
    component.handleSaveFilters();

    // Verify updateSavedFilter is called instead of createSavedFilter
    expect(tablesServiceMock.updateSavedFilter).toHaveBeenCalledWith(
      component.data.connectionID,
      component.data.tableName,
      filterId,
      {
        name: component.data.filtersSet.name,
        filters: { [fieldName]: { eq: 'test_value' } }
      }
    );
    expect(tablesServiceMock.createSavedFilter).not.toHaveBeenCalled();
  });

  it('should create new filter when id is not present', () => {
    // Setup
    const fieldName = 'test_field';
    component.tableRowFieldsShown = { [fieldName]: 'test_value' };
    component.tableRowFieldsComparator = { [fieldName]: 'eq' };
    component.data.filtersSet.id = undefined; // No ID means creating a new filter
    tablesServiceMock.createSavedFilter.and.returnValue(of({}));

    // Call handleSaveFilters
    component.handleSaveFilters();

    // Verify createSavedFilter is called
    expect(tablesServiceMock.createSavedFilter).toHaveBeenCalledWith(
      component.data.connectionID,
      component.data.tableName,
      {
        name: component.data.filtersSet.name,
        filters: { [fieldName]: { eq: 'test_value' } }
      }
    );
    expect(tablesServiceMock.updateSavedFilter).not.toHaveBeenCalled();
  });
});
