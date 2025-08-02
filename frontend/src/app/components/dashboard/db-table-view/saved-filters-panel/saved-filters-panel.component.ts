import { ActivatedRoute, Router } from '@angular/router';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { CommonModule } from '@angular/common';
import JsonURL from '@jsonurl/jsonurl';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SavedFiltersDialogComponent } from './saved-filters-dialog/saved-filters-dialog.component';
import { TablesService } from 'src/app/services/tables.service';
import { normalizeTableName } from 'src/app/lib/normalize';

@Component({
  selector: 'app-saved-filters-panel',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatTooltipModule,
  ],
  templateUrl: './saved-filters-panel.component.html',
  styleUrl: './saved-filters-panel.component.css'
})
export class SavedFiltersPanelComponent implements OnInit {
  @Input() connectionID: string;
  @Input() selectedTableName: string;
  @Input() selectedTableDisplayName: string;
  // @Input() savedFilterData: any;
  @Output() filterSelected = new EventEmitter<any>();

  public savedFilterData: any[] = [];
  public selectedFilterIndex: number = -1;
    public displayedComparators = {
    eq: "=",
    gt: ">",
    lt: "<",
    gte: ">=",
    lte: "<="
  }

  constructor(
    private dialog: MatDialog,
    private _tables: TablesService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this._tables.getSavedFilters(this.connectionID, this.selectedTableName).subscribe({
      next: (data) => {
        this.savedFilterData = data;
        console.log('Saved filters data:', this.savedFilterData);

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

  handleOpenSavedFiltersDialog() {
    this.dialog.open(SavedFiltersDialogComponent, {
      width: '56em',
      data: {
        connectionID: this.connectionID,
        tableName: this.selectedTableName,
        displayTableName: this.selectedTableDisplayName,
        savedFilterData: this.savedFilterData
      }
    });
  }

  /**
   * Transform the filters object into an array of entries for display
   * @param filters The filters object from saved filter data
   * @returns Array of objects with column, operator, and value
   */
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

  /**
   * Select a filter and emit the selection event
   * @param index Index of the selected filter
   */
  selectFilter(index: number): void {
    this.selectedFilterIndex = index;
    const selectedFilter = this.savedFilterData[index];
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
}
