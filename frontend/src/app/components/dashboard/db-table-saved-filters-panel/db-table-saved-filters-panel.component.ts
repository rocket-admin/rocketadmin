import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { CommonModule } from '@angular/common';
import JsonURL from '@jsonurl/jsonurl';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TablesService } from 'src/app/services/tables.service';
import { Touchscreen } from 'puppeteer';
import { normalizeTableName } from '../../../lib/normalize'

@Component({
  selector: 'app-db-table-saved-filters-panel',
  imports: [
    CommonModule,
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    MatMenuModule,
    RouterModule
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
  @Output() requestFilteredRows = new EventEmitter();

  // public savedFiltersList = [];
  public savedFiltersMap = {};
  // public savedFiltersURLs = {};

  public selectedSavedFilterID = null;

  public displayedComparators = {
    eq: "=",
    gt: ">",
    lt: "<",
    gte: ">=",
    lte: "<="
  }

  constructor(
    private _tables: TablesService,
    public router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    console.log('ngOnInit savedFilters', this.savedFilters);
    if (this.savedFilters && this.savedFilters.length) {
      this.selectedSavedFilterID = this.savedFilters[0]?.id;

      this.savedFiltersMap = this.savedFilters.reduce((acc, filter) => {
        acc[filter.id] = filter;
        return acc;
      }, {});

      this.selectedSavedFilterID = this.route.snapshot.queryParams.saved_filter_id;
      if (this.selectedSavedFilterID) {
        this.requestFilteredRows.emit(this.savedFiltersMap[this.selectedSavedFilterID].filters);
      } else {
        if (this.savedFilters.length) {
          this.requestFilteredRows.emit(this.savedFilters[0].filters)
          this.router.navigate([`/dashboard/${this.connectionID}/${this.name}`], {
            queryParams: {
              saved_filter_id: this.savedFilters[0]?.id,
              page_index: 0,
              page_size: 30
            }
          });
        };
      }
    }

    console.log('savedFiltersMap', this.savedFiltersMap);
  }

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

  filterSwitch(savedFilter) {
    this.selectedSavedFilterID = savedFilter.id;
    this.requestFilteredRows.emit(savedFilter.filters);
    console.log('selectedSavedFilterID', this.selectedSavedFilterID);
  }
}
