import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

import { TablesService } from 'src/app/services/tables.service';
import { normalizeTableName } from '../../../lib/normalize'
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-db-table-saved-filters-panel',
  imports: [
    CommonModule,
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    MatMenuModule,

  ],
  templateUrl: './db-table-saved-filters-panel.component.html',
  styleUrl: './db-table-saved-filters-panel.component.css'
})
export class DbTableSavedFiltersPanelComponent {
  @Input() connectionID: string;
  @Input() name: string;
  @Input() savedFilters: Array<{id: string, name: string, filters: Array<{key: string, value: object}>}>;

  @Output() handleOpenSavedFiltersDialog = new EventEmitter();
  @Output() removeFilter = new EventEmitter();

  public displayedComparators = {
    eq: "=",
    gt: ">",
    lt: "<",
    gte: ">=",
    lte: "<="
  }

  constructor(
    private _tables: TablesService,

  ) {}

  getFilter(activeFilter: {key: string, value: object}) {
    const displayedName = normalizeTableName(activeFilter.key);
    const comparator = Object.keys(activeFilter.value)[0];
    const filterValue = Object.values(activeFilter.value)[0];
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
      return `${displayedName} ${this.displayedComparators[Object.keys(activeFilter.value)[0]]} ${filterValue}`
    }
  }

  getFiltersCount(activeFilters: object) {
    if (activeFilters) return Object.keys(activeFilters).length;
    return 0;
  }

  deleteSavedFilter(filterId: string) {
    this._tables.deleteSavedFilter(this.connectionID, this.name, filterId).subscribe();
  }
}
