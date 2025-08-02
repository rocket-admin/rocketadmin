import { Component, EventEmitter, Input, Output } from '@angular/core';

import { CommonModule } from '@angular/common';
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
export class SavedFiltersPanelComponent {
  @Input() connectionID: string;
  @Input() selectedTableName: string;
  @Input() selectedTableDisplayName: string;
  // @Input() savedFilterData: any;
  @Output() filterSelected = new EventEmitter<any>();

  public savedFilterData: any[] = [];
  public selectedFilterIndex: number = 0;
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
  ) {}

  ngOnInit() {
    this._tables.getSavedFilters(this.connectionID, this.selectedTableName).subscribe({
      next: (data) => {
        this.savedFilterData = data;
        console.log('Saved filters data:', this.savedFilterData);
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
    this.filterSelected.emit(this.savedFilterData[index]);
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
