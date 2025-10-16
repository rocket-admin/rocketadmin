import { ActivatedRoute, Router } from '@angular/router';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { TableField, TableForeignKey } from 'src/app/models/table';

import { AccessLevel } from 'src/app/models/user';
import { Angulartics2OnModule } from 'angulartics2';
import { CommonModule } from '@angular/common';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DynamicModule } from 'ng-dynamic-component';
import { FormsModule } from '@angular/forms';
import JsonURL from '@jsonurl/jsonurl';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PlaceholderSavedFiltersComponent } from 'src/app/components/skeletons/placeholder-saved-filters/placeholder-saved-filters.component';
import { SavedFiltersDialogComponent } from './saved-filters-dialog/saved-filters-dialog.component';
import { TablesService } from 'src/app/services/tables.service';
import { UIwidgets } from 'src/app/consts/record-edit-types';
import { filterTypes } from 'src/app/consts/filter-types';
import { normalizeTableName } from 'src/app/lib/normalize';

@Component({
  selector: 'app-saved-filters-panel',
  imports: [
    CommonModule,
    FormsModule,
    DynamicModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    MatMenuModule,
    PlaceholderSavedFiltersComponent,
    Angulartics2OnModule
  ],
  templateUrl: './saved-filters-panel.component.html',
  styleUrl: './saved-filters-panel.component.css'
})
export class SavedFiltersPanelComponent implements OnInit, OnDestroy {
  @Input() connectionID: string;
  @Input() selectedTableName: string;
  @Input() selectedTableDisplayName: string;
  @Input() tableTypes: any;
  @Input() structure: any;
  @Input() tableForeignKeys: TableForeignKey[] = [];
  @Input() tableWidgets: any = {};
  // @Input() savedFilterData: any;
  @Output() filterSelected = new EventEmitter<any>();
  @Input() resetSelection: boolean = false;

  @Input() accessLevel: AccessLevel;

  private dynamicColumnValueDebounceTimer: any = null;

  public savedFilterData = null;
  public savedFilterMap: { [key: string]: any } = {};

  public selectedFilterSetId: string | null = null;
  public selectedFilter: any = null;
  public shouldAutofocus: boolean = false;

  public tableStructure: any = null;
  public tableRowFieldsShown: { [key: string]: any } = {};
  public tableRowStructure: { [key: string]: any } = {};
  public tableWidgetsList: string[] = [];
  public UIwidgets = UIwidgets;

  public displayedComparators = {
    eq: "=",
    gt: ">",
    lt: "<",
    gte: ">=",
    lte: "<=",
    startswith: "starts with",
    endswith: "ends with",
    contains: "contains",
    icontains: "not contains",
    empty: "is empty"
  }

  constructor(
    private dialog: MatDialog,
    private _tables: TablesService,
    private _connections: ConnectionsService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const tableNameFromUrl = params.get('table-name');
      if (tableNameFromUrl) {
        this.savedFilterData = null;
        this.selectedFilterSetId = null;
        this.selectedFilter = null;
        this.selectedTableName = tableNameFromUrl;
        this.loadSavedFilters();
      }
    });

    this.route.queryParamMap.subscribe(params => {
      const savedFilterId = params.get('saved_filter');
      if (savedFilterId) {
        this.selectedFilterSetId = savedFilterId;
      } else {
        this.selectedFilterSetId = null;
      }
    });

    this._tables.cast.subscribe((arg) => {
      if (arg === 'filters set saved') {
        this.loadSavedFilters();
      }

      if (arg === 'filters set updated') {
        // Get the current saved filter ID from URL
        const savedFilterIdFromUrl = this.route.snapshot.queryParams['saved_filter'];

        if (savedFilterIdFromUrl) {
          // If we have a filter selected in URL, get latest data and update URL
          this._tables.getSavedFilters(this.connectionID, this.selectedTableName).subscribe({
            next: (data) => {
              if (data) {
                // Find the updated filter in the response
                const updatedFilter = data.find(filter => filter.id === savedFilterIdFromUrl);
                if (updatedFilter) {
                  const processedFilter = this.processFiltersData(updatedFilter);

                  // Update local state
                  this.selectedFilterSetId = savedFilterIdFromUrl;
                  this.filterSelected.emit(processedFilter);

                  // Update URL with the refreshed filter data
                  const additionalParams: any = {
                    filters: JsonURL.stringify(updatedFilter.filters),
                    saved_filter: savedFilterIdFromUrl
                  };

                  if (updatedFilter.dynamic_column) {
                    additionalParams.dynamic_column = JsonURL.stringify({
                      column_name: updatedFilter.dynamic_column.column_name,
                      comparator: updatedFilter.dynamic_column.comparator
                    });
                  }

                  const queryParams = this.buildQueryParams(additionalParams);
                  this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`], { queryParams });
                }

                // Update the full filters map
                this.savedFilterData = data.sort((a, b) =>
                  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
                this.savedFilterMap = Object.assign({}, ...data.map((filter) => {
                  const transformedFilter = this.processFiltersData(filter);
                  return { [filter.id]: transformedFilter };
                }));
              }
            },
            error: (error) => {
              console.error('Error fetching updated filters:', error);
              this.loadSavedFilters();
            }
          });
        } else {
          // Just refresh filters if no filter selected in URL
          this.loadSavedFilters();
        }
      }

      if (arg === 'delete saved filters') {
        this.loadSavedFilters();
        this.selectedFilterSetId = null;
        this.filterSelected.emit(null);
        const queryParams = this.buildQueryParams();
        this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`], { queryParams });
      }
    });

    this.tableRowStructure = Object.assign({}, ...this.structure.map((field: TableField) => {
      return {[field.column_name]: field};
    }));
  }

  loadSavedFilters() {
    if (!this.connectionID || !this.selectedTableName) {
      return;
    }

    this._tables.getSavedFilters(this.connectionID, this.selectedTableName).subscribe({
      next: (data) => {
        if (data) {
          this.savedFilterData = data.sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          this.savedFilterMap = Object.assign({}, ...data.map((filter) => {
            const transformedFilter = this.processFiltersData(filter);
            return { [filter.id]: transformedFilter };
          }));

          const params = this.route.snapshot.queryParams;
          const dynamicColumn = params['dynamic_column'] ? JsonURL.parse(params['dynamic_column']) : null;

          if (this.selectedFilterSetId && this.savedFilterData.length > 0) {
            if (dynamicColumn && this.savedFilterMap[this.selectedFilterSetId]) {
              const filters = params['filters'] ? JsonURL.parse(params['filters']) : {};

              this.savedFilterMap[this.selectedFilterSetId].dynamicColumn = {
                column: dynamicColumn.column_name,
                operator: dynamicColumn.comparator,
                value: filters[dynamicColumn.column_name]?.[dynamicColumn.comparator] || null
              };
            }
          }
        }
      },
      error: (error) => {
        console.error('Error fetching saved filters:', error);
      }
    });
  }

  ngOnChanges() {
    if (this.resetSelection) {
      this.selectedFilterSetId = null;
    }
  }

  ngOnDestroy() {
    if (this.dynamicColumnValueDebounceTimer) {
      clearTimeout(this.dynamicColumnValueDebounceTimer);
    }
  }

  handleOpenSavedFiltersDialog(filtersSet: any = null) {
    const dialogRef = this.dialog.open(SavedFiltersDialogComponent, {
      width: '56em',
      data: {
        connectionID: this.connectionID,
        tableName: this.selectedTableName,
        displayTableName: this.selectedTableDisplayName,
        structure: this.structure,
        tableForeignKeys: this.tableForeignKeys,
        tableWidgets: this.tableWidgets,
        filtersSet: filtersSet ? filtersSet : {
          name: '',
          filters: {}
        }
      }
    });

    // No need to handle URL updates here - it's now handled in the tables.cast subscription
    // when 'filters set updated' is received
  }

  getFilterEntries(filters: any): { column: string; operator: string; value: string }[] {
    if (!filters) return [];

    const entries: { column: string; operator: string; value: string }[] = [];

    Object.keys(filters).forEach(column => {
      const operations = filters[column];
      Object.keys(operations).forEach(operator => {
        entries.push({
          column,
          operator,
          value: operations[operator]
        });
      });
    });
    return entries;
  }

  processFiltersData(filter: any) {
    const transformedFilter = {
      ...filter,
      filterEntries: this.getFilterEntries(filter.filters),
      staticFilters: [] as { column: string; operator: string; value: any }[],
      dynamicColumn: null as { column: string; operator: string; value: any } | null
    };

    if (filter.dynamic_column && filter.dynamic_column.column_name) {
      transformedFilter.dynamicColumn = {
        column: filter.dynamic_column.column_name,
        operator: filter.dynamic_column.comparator,
        value: null
      };

      const dynamicColFilters = filter.filters && filter.filters[filter.dynamic_column.column_name];
      if (dynamicColFilters) {
        const operator = filter.dynamic_column.comparator;
        transformedFilter.dynamicColumn.value = dynamicColFilters[operator];
      }
    }

    transformedFilter.staticFilters = this.getFilterEntries(filter.filters)
      .filter(entry => !filter.dynamic_column || entry.column !== filter.dynamic_column.column_name);

    return transformedFilter;
  }
  private buildQueryParams(additionalParams: any = {}): any {
    const currentParams = this.route.snapshot.queryParams;

    // Start with pagination parameters
    const queryParams: any = {
      page_index: 0,
      page_size: currentParams['page_size'] || 30,
      ...additionalParams
    };

    // Preserve sort parameters if present
    if (currentParams['sort_active']) {
      queryParams.sort_active = currentParams['sort_active'];
    }

    if (currentParams['sort_direction']) {
      queryParams.sort_direction = currentParams['sort_direction'];
    }

    return queryParams;
  }

  selectFiltersSet(selectedFilterSetId: string): void {
    console.log('selectFiltersSet ID:', selectedFilterSetId);
    if (this.selectedFilterSetId === selectedFilterSetId) {
      this.selectedFilterSetId = null;
      this.filterSelected.emit(null);
      this.shouldAutofocus = false;
      const queryParams = this.buildQueryParams();
      this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`], { queryParams });
    } else {
      this.selectedFilterSetId = selectedFilterSetId;
      this.shouldAutofocus = true;
      const selectedFilter = this.savedFilterMap[selectedFilterSetId];
      this.filterSelected.emit(selectedFilter);

      const additionalParams: any = {
        filters: JsonURL.stringify(selectedFilter.filters),
        saved_filter: selectedFilterSetId
      };

      if (selectedFilter.dynamicColumn) {
        additionalParams.dynamic_column = JsonURL.stringify({
          column_name: selectedFilter.dynamicColumn.column,
          comparator: selectedFilter.dynamicColumn.operator
        });
      }

      const queryParams = this.buildQueryParams(additionalParams);
      this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`], { queryParams });

      // Reset autofocus after the component has been rendered
      setTimeout(() => {
        this.shouldAutofocus = false;
      }, 500);
    }
  }

  selectFilter(entry: { column: string; operator: string; value: any }) {
    this.selectedFilter = entry;
  }

  getFilter(activeFilter: {column: string, operator: string, value: any}) {
    const displayedName = normalizeTableName(activeFilter.column);
    const comparator = activeFilter.operator;
    const filterValue = activeFilter.value;
    if (comparator == 'startswith') {
      return `${displayedName} = ${filterValue}...`
    } else if (comparator == 'endswith') {
      return `${displayedName} = ...${filterValue}`
    } else if (comparator == 'contains') {
      return `${displayedName} = ...${filterValue}...`
    } else if (comparator == 'icontains') {
      return `${displayedName} != ...${filterValue}...`
    } else if (comparator == 'empty') {
      return `${displayedName} = ' '`
    } else {
      return `${displayedName} ${this.displayedComparators[comparator]} ${filterValue}`
    }
  }

  get inputs() {
    return filterTypes[this._connections.currentConnection.type];
  }

  isWidget(columnName: string) {
    return this.tableWidgetsList.includes(columnName);
  }

  getInputType(field: string) {
    let widgetType;
    if (this.isWidget(field)) {
      widgetType = this.UIwidgets[this.tableWidgets[field].widget_type]?.type;
    } else {
      widgetType = this.inputs[this.tableTypes[field]]?.type;
    }
    return widgetType;
  }

  getComparatorType(typeOfComponent) {
    if (typeOfComponent === 'text') {
      return 'text';
    } else if (typeOfComponent === 'number' || typeOfComponent === 'datetime') {
      return 'number';
    } else {
      return 'nonComparable';
    }
  }

  setWidgets(widgets: any[]) {
    this.tableWidgetsList = widgets.map((widget: any) => widget.field_name);
    this.tableWidgets = Object.assign({}, ...widgets
      .map((widget: any) => {
        let params;
        if (widget.widget_params !== '// No settings required') {
          try {
            params = JSON.parse(widget.widget_params);
          } catch (e) {
            params = '';
          }
        } else {
          params = '';
        }
        return {
          [widget.field_name]: {...widget, widget_params: params}
        };
      })
    );
  }

  trackByFn(index: number, item: any) {
    return item.key;
  }

  updateDynamicColumnComparator = (comparator: string) => {
    if (!this.savedFilterMap) {
      console.error('savedFilterMap is undefined');
      return;
    }

    if (!this.selectedFilterSetId) {
      console.error('selectedFilterSetId is null or undefined');
      return;
    }

    const selectedFilter = this.savedFilterMap[this.selectedFilterSetId];
    if (!selectedFilter) {
      console.error(`No filter found with ID ${this.selectedFilterSetId} in savedFilterMap`);
      return;
    }

    if (!selectedFilter.dynamicColumn) {
      console.error('dynamicColumn is null or undefined for the selected filter');
      return;
    }

    selectedFilter.dynamicColumn.operator = comparator;

    if (comparator === 'empty') {
      selectedFilter.dynamicColumn.value = '';
    }
  }

  updateDynamicColumnValue = (value: any) => {
    if (!this.savedFilterMap) {
      console.error('savedFilterMap is undefined');
      return;
    }

    if (!this.selectedFilterSetId) {
      console.error('selectedFilterSetId is null or undefined');
      return;
    }

    const selectedFilter = this.savedFilterMap[this.selectedFilterSetId];
    if (!selectedFilter) {
      console.error(`No filter found with ID ${this.selectedFilterSetId} in savedFilterMap`);
      return;
    }

    if (!selectedFilter.dynamicColumn) {
      console.error('dynamicColumn is null or undefined for the selected filter');
      return;
    }

    console.log(value, 'value in updateDynamicColumnValue');

    selectedFilter.dynamicColumn.value = value;

    if (this.dynamicColumnValueDebounceTimer) {
      clearTimeout(this.dynamicColumnValueDebounceTimer);
    }

    this.dynamicColumnValueDebounceTimer = setTimeout(() => {
      this.applyDynamicColumnChanges();
    }, 800);
  }

  applyDynamicColumnChanges() {
    if (!this.selectedFilterSetId) return;

    const selectedFilter = this.savedFilterMap[this.selectedFilterSetId];

    console.log('Applying dynamic column changes for filter selectedFilter:', selectedFilter);

    if (!selectedFilter || !selectedFilter.dynamicColumn) return;

    const dynamicColumn = {
      column_name: selectedFilter.dynamicColumn.column,
      comparator: selectedFilter.dynamicColumn.operator
    };

    const filterValue = selectedFilter.dynamicColumn.value === '' || selectedFilter.dynamicColumn.value === undefined ? null : selectedFilter.dynamicColumn.value;

    const filters = { ...selectedFilter.filters };

    if (selectedFilter.dynamicColumn.column &&
        selectedFilter.dynamicColumn.operator &&
        filterValue !== null) {
      filters[selectedFilter.dynamicColumn.column] = {
        [selectedFilter.dynamicColumn.operator]: filterValue
      };
    } else {
      if (filters[selectedFilter.dynamicColumn.column]) {
        delete filters[selectedFilter.dynamicColumn.column];
      }
    }

    console.log('applyDynamicColumnChanges, filters:', filters);

    // Build filter-related params using the helper method
    const additionalParams: any = {
      filters: JsonURL.stringify(filters),
      dynamic_column: JsonURL.stringify(dynamicColumn),
      saved_filter: this.selectedFilterSetId
    };

    const queryParams = this.buildQueryParams(additionalParams);

    const updatedFilterData = {
      ...selectedFilter,
      filters: filters,
      dynamic_column: dynamicColumn
    };

    updatedFilterData.filterEntries = this.getFilterEntries(filters);

    this.filterSelected.emit(updatedFilterData);

    this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`], {
      queryParams
    });
  }
}
