import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CustomAction, TableForeignKey, TablePermissions } from 'src/app/models/table';

import { AccessLevel } from 'src/app/models/user';
import { ActivatedRoute } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { merge } from 'rxjs';
import { normalizeTableName } from '../../../lib/normalize'
import { tap } from 'rxjs/operators';
import JsonURL from "@jsonurl/jsonurl";

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
  @Output() search = new EventEmitter();
  @Output() removeFilter = new EventEmitter();
  @Output() resetAllFilters = new EventEmitter();
  @Output() activateAction = new EventEmitter();
  @Output() activateActions = new EventEmitter();

  public tableData: any;
  public selection: any;
  public columns: Column[];
  public displayedColumns: string[] = [];
  public columnsToDisplay: string[] = [];
  public searchString: string;
  public staticSearchString: string;
  public actionsColumnWidth: string;
  public bulkActions: CustomAction[];
  public bulkRows: string[];
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

  @Input() set rowSelection(value){
    if (value) this.selection = value;
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

  loadRowsPage() {
    const queryParams = this.route.snapshot.queryParams;
    const filters = JsonURL.parse( queryParams.filters );

    this.tableData.fetchRows({
      connectionID: this.connectionID,
      tableName: this.name,
      requstedPage: this.paginator.pageIndex,
      sortColumn: this.sort.active,
      sortOrder: this.sort.direction.toLocaleUpperCase(),
      filters,
      search: this.searchString,
      isTablePageSwitched: true
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.name && changes.name.currentValue && this.paginator) this.paginator.pageIndex = 0
  }

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
    if (this.tableData.widgets[column].widget_type === 'Select' && this.tableData.selectWidgetsOptions) {
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
    this.openFilters.emit({
      structure: this.tableData.structure,
      foreignKeysList: this.tableData.foreignKeysList,
      foreignKeys: this.tableData.foreignKeys,
      widgets: this.tableData.widgets
    });
    this.searchString = '';
  }

  handleSearch() {
    console.log('handle search');
    // event.preventDefault();
    this.searchString = this.searchString.trim();
    this.staticSearchString = this.searchString;
    console.log('this.searchString', this.searchString)
    this.search.emit(this.searchString);
  }

  clearSearch () {
    this.searchString = null;
    this.search.emit(this.searchString);
  }

  ngOnInit() {
    this.searchString = this.route.snapshot.queryParams.search;
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
    } else if (comparator == 'empty') {
      return `${displayedName} = ' '`
    } else {
      return `${displayedName} ${this.displayedComparators[Object.keys(activeFilter.value)[0]]} ${filterValue}`
    }
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    return this.paginator.pageSize === this.selection.selected.length;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.selection.select(...this.tableData.rowsSubject.value);
    }
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: any): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.position + 1}`;
  }

  // getBulkActions(actions) {
  //   console.log('get bulk actions')
  //   console.log(actions)
  //   return actions.filter((action: CustomAction) => actions.type === CustomActionType.Multiple)
  // }
}
