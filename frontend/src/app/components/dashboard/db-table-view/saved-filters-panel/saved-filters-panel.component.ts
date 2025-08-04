import { ActivatedRoute, Router } from '@angular/router';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

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
import { SavedFiltersDialogComponent } from './saved-filters-dialog/saved-filters-dialog.component';
import { TableForeignKey } from 'src/app/models/table';
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
    MatMenuModule
  ],
  templateUrl: './saved-filters-panel.component.html',
  styleUrl: './saved-filters-panel.component.css'
})
export class SavedFiltersPanelComponent implements OnInit {
  @Input() connectionID: string;
  @Input() selectedTableName: string;
  @Input() selectedTableDisplayName: string;
  @Input() tableTypes: any;
  @Input() structure: any;
  @Input() tableForeignKeys: TableForeignKey[] = [];
  @Input() tableWidgets: any = {};
  // @Input() savedFilterData: any;
  @Output() filterSelected = new EventEmitter<any>();

  public savedFilterData: any[] = [];
  public savedFilterMap: { [key: string]: any } = {};
  public selectedFilterIndex: number = -1;

  public selectedFilterSetId: string | null = null;
  public selectedFilter: any = null;

  public tableStructure: any = null;
  public tableRowFieldsShown: { [key: string]: any } = {};
  public tableRowStructure: { [key: string]: any } = {};
  // public tableForeignKeys: any[] = [];
  // public tableWidgets: { [key: string]: any } = {};
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
    this._tables.getSavedFilters(this.connectionID, this.selectedTableName).subscribe({
      next: (data) => {
        this.savedFilterData = data;
        this.savedFilterMap = Object.assign({}, ...data.map((filter, index) => {
          // Process the filter to separate static filters and dynamic column
          const transformedFilter = this.processFiltersData(filter);
          return { [filter.id]: transformedFilter };
        }));
        console.log('Saved filters map:', this.savedFilterMap);

        // Check if there's a saved_filter parameter in the URL
        this.route.queryParams.subscribe(params => {
          const savedFilterName = params['saved_filter'];

          if (savedFilterName && this.savedFilterData.length > 0) {
            // Find the index of the saved filter with the matching name
            const filterIndex = this.savedFilterData.findIndex(filter => filter.name === savedFilterName);

            // If found, select it
            if (filterIndex !== -1) {
              this.selectedFilterIndex = filterIndex;
              this.filterSelected.emit(this.savedFilterData[filterIndex]);
            }
          } else {
            // No filter specified in URL, keep selectedFilterIndex as -1 (none selected)
            this.selectedFilterIndex = -1;
          }
        });
      },
      error: (error) => {
        console.error('Error fetching saved filters:', error);
      }
    });
  }

  handleOpenSavedFiltersDialog(filtersSet: any = null) {
    this.dialog.open(SavedFiltersDialogComponent, {
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
  }

  getFilterEntries(filters: any): { column: string; operator: string; value: string }[] {
    if (!filters) return [];

    const entries: { column: string; operator: string; value: string }[] = [];

    Object.keys(filters).forEach(column => {
      const operations = filters[column];

      console.log('Operations for column:', column, operations);

      Object.keys(operations).forEach(operator => {
        entries.push({
          column,
          operator,
          value: operations[operator]
        });
      });
    });

    console.log('Filter entries:', entries);
    return entries;
  }

  /**
   * Process filters data to separate static filters and dynamic column
   */
  processFiltersData(filter: any) {
    // Create a transformed filter object with processed data
    const transformedFilter = {
      ...filter,
      filterEntries: this.getFilterEntries(filter.filters),
      staticFilters: [] as { column: string; operator: string; value: any }[],
      dynamicColumn: null as { column: string; operator: string; value: any } | null
    };

    // Process filter entries to separate static filters and dynamic column
    if (filter.dynamic_column && filter.dynamic_column.column_name) {
      // If we have a dynamic column, create it from the dynamic_column property
      transformedFilter.dynamicColumn = {
        column: filter.dynamic_column.column_name,
        operator: filter.dynamic_column.comparator,
        value: null // The actual value will come from filters if available
      };

      // If there's a corresponding filter entry for the dynamic column, use its value
      const dynamicColFilters = filter.filters && filter.filters[filter.dynamic_column.column_name];
      if (dynamicColFilters) {
        const operator = filter.dynamic_column.comparator;
        transformedFilter.dynamicColumn.value = dynamicColFilters[operator];
      }
    }

    // Create the static filters array (excluding the dynamic column)
    transformedFilter.staticFilters = this.getFilterEntries(filter.filters)
      .filter(entry => !filter.dynamic_column || entry.column !== filter.dynamic_column.column_name);

    return transformedFilter;
  }

  selectFiltersSet(selectedFilterSetId: string): void {
    this.selectedFilterSetId = selectedFilterSetId;
    const selectedFilter = this.savedFilterMap[selectedFilterSetId];
    this.filterSelected.emit(selectedFilter);

    // Get the current query params
    const currentParams = this.route.snapshot.queryParams;

    // Update the URL with the filter data and saved filter name
    const filters = JsonURL.stringify(selectedFilter.filters);

    // Create query params object
    const queryParams: any = {
      filters,
      page_index: 0,
      page_size: currentParams['page_size'] || 30, // Use current page size or default
      saved_filter: selectedFilter.name // Add the saved filter name to the URL
    };

    // Add dynamic_column to query params if it exists
    if (selectedFilter.dynamicColumn) {
      queryParams.dynamic_column = JsonURL.stringify({
        column_name: selectedFilter.dynamicColumn.column,
        comparator: selectedFilter.dynamicColumn.operator
      });
    }

    // Only add sorting params if they exist
    if (currentParams['sort_active']) {
      queryParams.sort_active = currentParams['sort_active'];
    }

    if (currentParams['sort_direction']) {
      queryParams.sort_direction = currentParams['sort_direction'];
    }

    this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`], {
      queryParams
    });
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

  // updateField = (updatedValue: any, field: string) => {
  //   this.selectedFilter.value = updatedValue;
  // }

  // updateComparator(event: string) {
  //   this.selectedFilter.operator = event;
  // }

  // cancelEditFilter() {
  //   this.selectedFilter = null;
  // }

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

  // Helper method to track objects in ngFor
  trackByFn(index: number, item: any) {
    return item.key;
  }

  // Save the edited filter
  applyEditedFilter() {
    console.log('Applying edited filter:', this.selectedFilter);
  }

  /**
   * Update dynamic column comparator
   * This is defined as an arrow function to ensure 'this' is bound correctly when called from template
   */
  updateDynamicColumnComparator = (comparator: string) => {
    console.log('Updating comparator:', comparator);
    console.log('Current savedFilterMap:', this.savedFilterMap);
    console.log('Current selectedFilterSetId:', this.selectedFilterSetId);

    // Check for all potential undefined/null values in the chain
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

    // If we get here, it's safe to update the comparator
    selectedFilter.dynamicColumn.operator = comparator;

    // If comparator is 'empty', set value to empty string
    if (comparator === 'empty') {
      selectedFilter.dynamicColumn.value = '';
    }

    console.log('Updated dynamic column comparator. New state:', selectedFilter.dynamicColumn);
  }

  /**
   * Update dynamic column value
   * This is defined as an arrow function to ensure 'this' is bound correctly when called from ndc-dynamic
   */
  updateDynamicColumnValue = (value: any) => {
    console.log('Updating dynamic column value:', value);
    console.log('Current savedFilterMap:', this.savedFilterMap);
    console.log('Current selectedFilterSetId:', this.selectedFilterSetId);

    // Check for all potential undefined/null values in the chain
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

    // If we get here, it's safe to update the value
    selectedFilter.dynamicColumn.value = value;
    console.log('Updated dynamic column value. New state:', selectedFilter.dynamicColumn);
  }

  /**
   * Apply changes to the dynamic column and rerender the table
   * This doesn't affect saved filter settings
   */
  applyDynamicColumnChanges() {
    if (!this.selectedFilterSetId) return;

    const selectedFilter = this.savedFilterMap[this.selectedFilterSetId];

    console.log('Applying dynamic column changes for filter selectedFilter:', selectedFilter);

    if (!selectedFilter || !selectedFilter.dynamicColumn) return;

    // Get the current query params
    const currentParams = this.route.snapshot.queryParams;

    // Create dynamic column object for the query params
    const dynamicColumn = {
      column_name: selectedFilter.dynamicColumn.column,
      comparator: selectedFilter.dynamicColumn.operator
    };

    // Create filter value for the dynamic column
    const filterValue = selectedFilter.dynamicColumn.value === '' ||
                       selectedFilter.dynamicColumn.value === undefined ?
                       null : selectedFilter.dynamicColumn.value;

    // Create a copy of the original filters
    const filters = { ...selectedFilter.filters };

    console.log('dynamicColumn:', selectedFilter.dynamicColumn);

    // Only add the dynamic column to filters if it has a non-null value
    if (selectedFilter.dynamicColumn.column &&
        selectedFilter.dynamicColumn.operator &&
        filterValue !== null) {
      // Add or update the filter for the dynamic column
      filters[selectedFilter.dynamicColumn.column] = {
        [selectedFilter.dynamicColumn.operator]: filterValue
      };
    } else {
      // If the dynamic column exists in filters, remove it
      if (filters[selectedFilter.dynamicColumn.column]) {
        delete filters[selectedFilter.dynamicColumn.column];
      }
    }

    console.log('Applying dynamic column changes, add dynamicColumn to filters:', filters);

    // Update the URL with the updated filter data
    const queryParams: any = {
      filters: JsonURL.stringify(filters),
      dynamic_column: JsonURL.stringify(dynamicColumn),
      page_index: 0, // Reset to first page
      page_size: currentParams['page_size'] || 30,
      saved_filter: selectedFilter.name
    };

    // Only add sorting params if they exist
    if (currentParams['sort_active']) {
      queryParams.sort_active = currentParams['sort_active'];
    }

    if (currentParams['sort_direction']) {
      queryParams.sort_direction = currentParams['sort_direction'];
    }

    // Create updated filter data for rendering the table with dynamic column merged into filters
    const updatedFilterData = {
      ...selectedFilter,
      filters: filters, // Filters already include the dynamic column from previous logic
      dynamic_column: dynamicColumn
    };

    // Also ensure we keep the original filter entries format updated
    updatedFilterData.filterEntries = this.getFilterEntries(filters);

    // Emit the updated filter to update the table view
    this.filterSelected.emit(updatedFilterData);

    // Navigate with updated query params to rerender the table
    this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`], {
      queryParams
    });
  }
}
