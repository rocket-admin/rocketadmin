import * as JSON5 from 'json5';

import { ActivatedRoute, Router } from '@angular/router';
import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CustomAction, TableForeignKey, TablePermissions, TableProperties, TableRow, Widget } from 'src/app/models/table';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Observable, merge, of } from 'rxjs';
import { UIwidgets, tableDisplayTypes } from '../../../consts/table-display-types';
import { map, startWith, tap } from 'rxjs/operators';

import { AccessLevel } from 'src/app/models/user';
import { Angulartics2OnModule } from 'angulartics2';
// Import all display components
import { BaseTableDisplayFieldComponent } from '../../ui-components/table-display-fields/base-table-display-field/base-table-display-field.component';
import { BooleanDisplayComponent } from '../../ui-components/table-display-fields/boolean/boolean.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CodeDisplayComponent } from '../../ui-components/table-display-fields/code/code.component';
import { CommonModule } from '@angular/common';
import { ConnectionsService } from 'src/app/services/connections.service';
import { CountryDisplayComponent } from '../../ui-components/table-display-fields/country/country.component';
import { DateDisplayComponent } from '../../ui-components/table-display-fields/date/date.component';
import { DateTimeDisplayComponent } from '../../ui-components/table-display-fields/date-time/date-time.component';
import { DbTableExportDialogComponent } from '../db-table-export-dialog/db-table-export-dialog.component';
import { DbTableImportDialogComponent } from '../db-table-import-dialog/db-table-import-dialog.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { DynamicModule } from 'ng-dynamic-component';
import { FileDisplayComponent } from '../../ui-components/table-display-fields/file/file.component';
import { ForeignKeyDisplayComponent } from '../../ui-components/table-display-fields/foreign-key/foreign-key.component';
import { IdDisplayComponent } from '../../ui-components/table-display-fields/id/id.component';
import { ImageDisplayComponent } from '../../ui-components/table-display-fields/image/image.component';
import { JsonEditorDisplayComponent } from '../../ui-components/table-display-fields/json-editor/json-editor.component';
import JsonURL from "@jsonurl/jsonurl";
import { LongTextDisplayComponent } from '../../ui-components/table-display-fields/long-text/long-text.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator } from '@angular/material/paginator';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MoneyDisplayComponent } from '../../ui-components/table-display-fields/money/money.component';
import { NotificationsService } from 'src/app/services/notifications.service';
import { NumberDisplayComponent } from '../../ui-components/table-display-fields/number/number.component';
import { PasswordDisplayComponent } from '../../ui-components/table-display-fields/password/password.component';
import { PhoneDisplayComponent } from '../../ui-components/table-display-fields/phone/phone.component';
import { PlaceholderTableDataComponent } from '../../skeletons/placeholder-table-data/placeholder-table-data.component';
import { PointDisplayComponent } from '../../ui-components/table-display-fields/point/point.component';
import { RouterModule } from '@angular/router';
import { SelectDisplayComponent } from '../../ui-components/table-display-fields/select/select.component';
import { SelectionModel } from '@angular/cdk/collections';
import { StaticTextDisplayComponent } from '../../ui-components/table-display-fields/static-text/static-text.component';
import { TableRowService } from 'src/app/services/table-row.service';
import { TableStateService } from 'src/app/services/table-state.service';
import { TextDisplayComponent } from '../../ui-components/table-display-fields/text/text.component';
import { TimeDisplayComponent } from '../../ui-components/table-display-fields/time/time.component';
import { TimeIntervalDisplayComponent } from '../../ui-components/table-display-fields/time-interval/time-interval.component';
import { UrlDisplayComponent } from '../../ui-components/table-display-fields/url/url.component';
import { formatFieldValue } from 'src/app/lib/format-field-value';
import { normalizeTableName } from '../../../lib/normalize'
import { getTableTypes } from 'src/app/lib/setup-table-row-structure';

interface Column {
  title: string,
  selected: boolean
}

@Component({
  selector: 'app-db-table',
  templateUrl: './db-table.component.html',
  styleUrls: ['./db-table.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule,
    MatAutocompleteModule,
    MatMenuModule,
    MatTooltipModule,
    ClipboardModule,
    DragDropModule,
    Angulartics2OnModule,
    PlaceholderTableDataComponent,
    DynamicModule,
    // Display components for different field types
    // BaseTableDisplayFieldComponent,
    // TextDisplayComponent,
    // LongTextDisplayComponent,
    // IdDisplayComponent,
    // BooleanDisplayComponent,
    ForeignKeyDisplayComponent,
    // DateDisplayComponent,
    // DateTimeDisplayComponent,
    // TimeDisplayComponent,
    // SelectDisplayComponent,
    // CodeDisplayComponent,
    // MoneyDisplayComponent,
    // PasswordDisplayComponent,
    // FileDisplayComponent,
    // ImageDisplayComponent,
    // UrlDisplayComponent,
    // JsonEditorDisplayComponent,
    // NumberDisplayComponent,
    // StaticTextDisplayComponent,
    // CountryDisplayComponent,
    // PhoneDisplayComponent,
    // PointDisplayComponent,
    // TimeIntervalDisplayComponent
  ]
})

export class DbTableComponent implements OnInit {

  @Input() name: string;
  @Input() displayName: string;
  @Input() permissions: TablePermissions;
  @Input() accessLevel: AccessLevel;
  @Input() connectionID: string;
  @Input() isTestConnection: boolean;
  @Input() activeFilters: object;
  @Input() filterComparators: object;
  @Input() selection: SelectionModel<any>;
  @Input() tables: TableProperties[];

  @Output() openFilters = new EventEmitter();
  @Output() openPage = new EventEmitter();
  @Output() search = new EventEmitter();
  @Output() removeFilter = new EventEmitter();
  @Output() resetAllFilters = new EventEmitter();
  // @Output() viewRow = new EventEmitter();
  @Output() activateAction = new EventEmitter();
  @Output() activateActions = new EventEmitter();

  // public tablesSwitchControl = new FormControl('');
  public tableData: any;
  public filteredTables: TableProperties[];
  // public selection: any;
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
  public selectedRow: TableRow = null;
  public selectedRowType: 'record' | 'foreignKey' = 'record';
  public tableRelatedRecords: any = null;
  public displayCellComponents;
  public UIwidgets = UIwidgets;
  public tableTypes: object;

  @Input() set table(value){
    if (value) this.tableData = value;
  }

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private _tableState: TableStateService,
    private _notifications: NotificationsService,
    private _tableRow: TableRowService,
    private _connections: ConnectionsService,
    private route: ActivatedRoute,
    public router: Router,
    public dialog: MatDialog,
  ) {}

  ngAfterViewInit() {
    this.tableData.paginator = this.paginator;

    this.tableData.sort = this.sort;
    // this.sort.sortChange.subscribe(() => { this.paginator.pageIndex = 0 });

    merge(this.sort.sortChange, this.paginator.page)
      .pipe(
          tap(() => {

            const filters = JsonURL.stringify( this.activeFilters );
            this.router.navigate([`/dashboard/${this.connectionID}/${this.name}`], {
              queryParams: {
                filters,
                sort_active: this.sort.active,
                sort_direction: this.sort.direction.toUpperCase(),
                page_index: this.paginator.pageIndex,
                page_size: this.paginator.pageSize
              }
            });
            this.loadRowsPage();
          })
      )
      .subscribe();
  }

  ngOnInit() {
    this.searchString = this.route.snapshot.queryParams.search;

    const connectionType = this._connections.currentConnection.type;
    this.displayCellComponents = tableDisplayTypes[connectionType];

    this._tableState.cast.subscribe(row => {
      this.selectedRow = row;
    });
  }

  onInput(searchValue: string) {
    this.filteredTables = this.filterTables(searchValue)
  }

  onInputFocus() {
    this.filteredTables = this.tables;
  }

  private filterTables(searchValue: string): any[] {
    const filterValue = searchValue.toLowerCase();
    return this.tables.filter((table) =>
      table.normalizedTableName.toLowerCase().includes(filterValue)
    );
  }

  loadRowsPage() {
    this.tableRelatedRecords = null;
    this.tableData.fetchRows({
      connectionID: this.connectionID,
      tableName: this.name,
      requstedPage: this.paginator.pageIndex,
      pageSize: this.paginator.pageSize,
      sortColumn: this.sort.active,
      sortOrder: this.sort.direction.toUpperCase(),
      filters: this.activeFilters,
      search: this.searchString,
      isTablePageSwitched: true
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.name && changes.name.currentValue && this.paginator) {
      this.paginator.pageIndex = 0;
      this.searchString = '';
    }
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
    this.searchString = this.searchString.trim();
    this.staticSearchString = this.searchString;
    this.search.emit(this.searchString);
  }

  handleOpenExportDialog() {
    this.dialog.open(DbTableExportDialogComponent, {
      width: '25em',
      data: {
        connectionID: this.connectionID,
        tableName: this.name,
        sortColumn: this.sort.active,
        sortOrder: this.sort.direction.toUpperCase(),
        filters: this.activeFilters,
        search: this.searchString
      }
    })
  }

  handleOpenImportDialog() {
    this.dialog.open(DbTableImportDialogComponent, {
      width: '25em',
      data: {
        connectionID: this.connectionID,
        tableName: this.name,
        isTestConnection: this.isTestConnection
      }
    })
  }

  clearSearch () {
    this.searchString = null;
    this.search.emit(this.searchString);
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

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    return this.tableData.rowsSubject.value.length === this.selection.selected.length;
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

  stashUrlParams() {
    this._tableState.setBackUrlParams(this.route.snapshot.queryParams.page_index, this.route.snapshot.queryParams.page_size, this.route.snapshot.queryParams.sort_active, this.route.snapshot.queryParams.sort_direction);
    this.stashFilters();
  }

  stashFilters() {
    if (this.activeFilters && Object.keys(this.activeFilters).length > 0) {
      this._tableState.setBackUrlFilters(this.activeFilters);
    } else {
      this._tableState.setBackUrlFilters(null);
    }
  }

  getIdentityFieldsValues() {
    if (this.tableData.identityColumn) return this.selection.selected.map(row => row[this.tableData.identityColumn]);
    return null;
  }

  handleAction(e, action, element) {
    e.stopPropagation();

    this.activateActions.emit({
      action,
      primaryKeys: [this.tableData.getQueryParams(element)],
      ...(this.tableData.identityColumn ? {identityFieldValues: [element[this.tableData.identityColumn]]} : null)
    })
  }

  handleActions(action) {
    const primaryKeys = this.selection.selected.map(row => this.tableData.getQueryParams(row));
    const identityFieldValues = this.getIdentityFieldsValues();

    this.activateActions.emit({
      action,
      primaryKeys,
      identityFieldValues
    })
  }

  handleDeleteRow(e, element){
    e.stopPropagation();
    this.stashFilters();

    this.activateActions.emit({
      action: {
          title: 'Delete row',
          type: 'multiple',
          require_confirmation: true
      },
      primaryKeys: [this.tableData.getQueryParams(element)],
      ...(this.tableData.identityColumn ? {identityFieldValues: [element[this.tableData.identityColumn]]} : null)
    })
  }

  handleViewRow(row: TableRow) {
    this.selectedRowType = 'record';
    this._tableState.selectRow({
      connectionID: this.connectionID,
      tableName: this.name,
      record: row,
      columnsOrder: this.tableData.dataColumns,
      primaryKeys: this.tableData.getQueryParams(row),
      foreignKeys: this.tableData.foreignKeys,
      foreignKeysList: this.tableData.foreignKeysList,
      widgets: this.tableData.widgets,
      widgetsList: this.tableData.widgetsList,
      relatedRecords: this.tableData.relatedRecords || null,
      link: `/dashboard/${this.connectionID}/${this.name}/entry`
    });
  }

  handleForeignKeyView(foreignKeys, row) {
    this.selectedRowType = 'foreignKey';

    this._tableState.selectRow({
      connectionID: null,
      tableName: null,
      record: null,
      columnsOrder: null,
      primaryKeys: null,
      foreignKeys: null,
      foreignKeysList: null,
      widgets: null,
      widgetsList: null,
      relatedRecords: null,
      link: null
    })

    this._tableRow.fetchTableRow(this.connectionID, foreignKeys.referenced_table_name, {[foreignKeys.referenced_column_name]: row[foreignKeys.referenced_column_name]})
      .subscribe(res => {
        const filedsTypes = res.structure.reduce((acc, field) => {
          acc[field.column_name	] = field.data_type;
          return acc;
        }, {});

        const formattedRecord = Object.entries(res.row).reduce((acc, [key, value]) => {
          acc[key] = formatFieldValue(value, filedsTypes[key]);
          return acc;
        }, {})

        this._tableState.selectRow({
          connectionID: this.connectionID,
          tableName: foreignKeys.referenced_table_name,
          record: formattedRecord,
          columnsOrder: res.list_fields,
          primaryKeys: {
            [foreignKeys.referenced_column_name]: res.row[foreignKeys.referenced_column_name]
          },
          foreignKeys: Object.assign({}, ...res.foreignKeys.map((foreignKey: TableForeignKey) => ({[foreignKey.column_name]: foreignKey}))),
          foreignKeysList: res.foreignKeys.map(fk => fk.column_name),
          widgets: Object.assign({}, ...res.table_widgets.map((widget: Widget) => {
              let parsedParams;

              try {
                parsedParams = JSON5.parse(widget.widget_params);
              } catch {
                parsedParams = {};
              }

              return {
                [widget.field_name]: {
                  ...widget,
                  widget_params: parsedParams,
                },
              };
            })
          ),
          widgetsList: res.table_widgets.map(widget => widget.field_name),
          relatedRecords: res.referenced_table_names_and_columns[0],
          link: `/dashboard/${this.connectionID}/${foreignKeys.referenced_table_name}/entry`
        });
      })
  }

  handleViewAIpanel() {
    this._tableState.handleViewAIpanel();
  }

  isRowSelected(primaryKeys) {
    // console.log('isRowSelected', this.selectedRowType, this.selectedRow, primaryKeys);
    if (this.selectedRowType === 'record' && this.selectedRow && this.selectedRow.primaryKeys !== null) return Object.keys(this.selectedRow.primaryKeys).length && JSON.stringify(this.selectedRow.primaryKeys) === JSON.stringify(primaryKeys);
    return false;
  }

  isForeignKeySelected(record, foreignKey: TableForeignKey) {
    const primaryKeyValue = record[foreignKey.referenced_column_name];

    if (this.selectedRowType === 'foreignKey' && this.selectedRow && this.selectedRow.record !== null) {
      return Object.values(this.selectedRow.primaryKeys)[0] === primaryKeyValue && this.selectedRow.tableName === foreignKey.referenced_table_name;
    }
    return false;
  }

  showCopyNotification = (message: string) => {
    this._notifications.showSuccessSnackbar(message);
  }

  switchTable(e) {

  }
}
