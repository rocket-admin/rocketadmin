import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CustomAction, TableForeignKey, TablePermissions } from 'src/app/models/table';
import { getComparators, getFilters } from 'src/app/lib/parse-filter-params';

import { AccessLevel } from 'src/app/models/user';
import { ActivatedRoute } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { merge } from 'rxjs';
import { normalizeTableName } from '../../../lib/normalize'
import { tap } from 'rxjs/operators';

interface Column {
  title: string,
  selected: boolean
}

@Component({
  selector: 'app-db-table',
  templateUrl: './db-table.component.html',
  styleUrls: ['./db-table.component.css']
})

export class DbTableComponent implements OnInit {

  @Input() name: string;
  @Input() displayName: string;
  @Input() permissions: TablePermissions;
  @Input() accessLevel: AccessLevel;
  @Input() connectionID: string;
  @Input() activeFilters: object;
  @Input() filterComparators: object;

  @Output() openFilters = new EventEmitter();
  @Output() openPage = new EventEmitter();
  @Output() deleteRow = new EventEmitter();
  @Output() search = new EventEmitter();
  @Output() removeFilter = new EventEmitter();
  @Output() resetAllFilters = new EventEmitter();
  @Output() activateAction = new EventEmitter();

  public tableData: any;
  public columns: Column[];
  public displayedColumns: string[] = [];
  public columnsToDisplay: string[] = [];
  public searchString: string;
  public actionsColumnWidth: string;
  public displayedComparators = {
    eq: "=",
    gt: ">",
    lt: "<",
    gte: ">=",
    lte: "<="
  }

  @Input() set table(value){
    if (value) this.tableData = value;
  }

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private route: ActivatedRoute,
  ) {}

  ngAfterViewInit() {
    this.tableData.paginator = this.paginator;

    this.tableData.sort = this.sort;
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

    merge(this.sort.sortChange, this.paginator.page)
      .pipe(
          tap(() => this.loadRowsPage())
      )
      .subscribe();
  }

  // @ViewChild('focus', { read: ElementRef }) tableHeader: ElementRef;
  // scrollUp(): void {
  //   this.tableHeader.nativeElement.scrollIntoView({ behavior: 'smooth', block: "start" });
  // }

  loadRowsPage() {
    const queryParams = this.route.snapshot.queryParams;
    const filters = getFilters(queryParams);
    const comparators = getComparators(queryParams);

    this.tableData.fetchRows({
      connectionID: this.connectionID,
      tableName: this.name,
      requstedPage: this.paginator.pageIndex,
      sortColumn: this.sort.active,
      sortOrder: this.sort.direction.toLocaleUpperCase(),
      filters,
      comparators,
      isTablePageSwitched: true
    });
  }

  // scrollToTop() {
  //   console.log('scrollToTop');
  //   window.scrollTo(0, 0);
  // }

  isSortable(column: string) {
    return this.tableData.sortByColumns.includes(column) || !this.tableData.sortByColumns.length;
  }

  isForeignKey(column: string) {
    return this.tableData.foreignKeysList.includes(column);
  }

  getForeignKeyQueryParams(foreignKey: TableForeignKey, cell) {
    return {
      [foreignKey.referenced_column_name]: cell[foreignKey.referenced_column_name]
    }
  }

  isWidget(column: string) {
    if (this.tableData.widgetsList) return this.tableData.widgetsList.includes(column);
  }

  getWidgetValue(column: string, value: string) {
    if (this.tableData.selectWidgetsOptions && this.tableData.widgets[column].widget_type === 'Select') {
        const fieldOptions = this.tableData.selectWidgetsOptions[column];
        if (fieldOptions) {
          const cellValue = fieldOptions.find(option => option.value === value);
            if (cellValue) return cellValue.label
        }
    }
    return value;
  }

  getCellValue(foreignKey: TableForeignKey, cell) {
    const identityColumnName = Object.keys(cell).find(key => key !== foreignKey.referenced_column_name);
    if (identityColumnName) {
      return cell[identityColumnName]
    } else {
      return cell[foreignKey.referenced_column_name]
    }
  }

  getFiltersCount(activeFilters: object) {
    if (activeFilters) return Object.keys(activeFilters).length;
    return 0;
  }

  handleOpenFilters() {
    this.openFilters.emit();
    this.searchString = '';
  }

  handleSearch () {
    this.search.emit(this.searchString);
  }

  clearSearch () {
    this.searchString = null;
    this.search.emit(this.searchString);
  }

  ngOnInit() {
    this.searchString = this.route.snapshot.queryParams.search;
  }

  getFilter(filterKey: string, filterValue: string) {
    const displayedName = normalizeTableName(filterKey);
    if (this.filterComparators[filterKey] == 'startswith') {
      return `${displayedName} = ${filterValue}...`
    } else if (this.filterComparators[filterKey] == 'endswith') {
      return `${displayedName} = ...${filterValue}`
    } else if (this.filterComparators[filterKey] == 'contains') {
      return `${displayedName} = ...${filterValue}...`
    } else {
      return `${displayedName} ${this.displayedComparators[this.filterComparators[filterKey]]} ${filterValue}`
    }
  }

  handleActivateAction(action: CustomAction, primaryKeys: object) {
    this.activateAction.emit({action, primaryKeys});
  }

  getActionsColumnWidth(actions, permissions) {
    const defaultActionsCount = permissions.edit + permissions.delete;
    return (((actions.length + defaultActionsCount) * 40) + 32);
  }
}
