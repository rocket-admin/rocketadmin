import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { first, map } from 'rxjs/operators';
import { getComparators, getFilters } from 'src/app/lib/parse-filter-params';

import { ConnectionsService } from 'src/app/services/connections.service';
import { DbActionConfirmationDialogComponent } from './db-action-confirmation-dialog/db-action-confirmation-dialog.component';
import { DbTableFiltersDialogComponent } from './db-table-filters-dialog/db-table-filters-dialog.component';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { NotificationsService } from 'src/app/services/notifications.service';
import { CustomAction, TableProperties } from 'src/app/models/table';
import { TableRowService } from 'src/app/services/table-row.service';
import { TablesDataSource } from './db-tables-data-source';
import { TablesService } from 'src/app/services/tables.service';
import { User } from 'src/app/models/user';
import { normalizeTableName } from '../../lib/normalize'
import { omitBy } from "lodash";
import { BbBulkActionConfirmationDialogComponent } from './db-bulk-action-confirmation-dialog/db-bulk-action-confirmation-dialog.component';
import { SelectionModel } from '@angular/cdk/collections';
import { DbActionLinkDialogComponent } from './db-action-link-dialog/db-action-link-dialog.component';

interface DataToActivateActions {
  action: CustomAction,
  selectedRows: object[]
}

interface DataToActivateAction {
  action: CustomAction,
  primaryKeys: object
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  public user: User = null;
  public tablesList: TableProperties[] = null;
  public selectedTableName: string;
  public selectedTableDisplayName: string;
  // public selectedTablePermissions: Object = null;
  public currentPage: number = 1;
  public shownTableTitles: boolean = true;
  public connectionID: string;
  public filters: object;
  public comparators: object;

  public loading: boolean = true;
  public dbFetchError: boolean = false;
  public errorMessage: string;

  public noTablesError: boolean = false;

  public dataSource: TablesDataSource = null;

  public selection = new SelectionModel<any>(true, []);

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    public dialog: MatDialog,
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private _notifications: NotificationsService,
    private _tableRow: TableRowService,
  ) {}

  get currentConnectionAccessLevel () {
    return this._connections.currentConnectionAccessLevel
  }

  async ngOnInit() {
    this.connectionID = this._connections.currentConnectionID;
    this.dataSource = new TablesDataSource(this._tables, this._notifications, this._connections);

    let tables;
    try {
      tables = await this.getTables();
    } catch(error) {
      this.loading = false;
      this.dbFetchError = true;
      if (error instanceof HttpErrorResponse) {
        this.errorMessage = error.error.message
      } else  { throw error };
    }

    if (tables && tables.length === 0) {
      this.noTablesError = true;
      this.loading = false;
    } else if (tables) {
      this.formatTableNames(tables);
      this.route.paramMap
        .pipe(
          map((params: ParamMap) => {
            const tableName = params.get('table-name');
            if (tableName) {
              this.selectedTableName = tableName;
              this.setTable(tableName);
              this.selection.clear();
            } else {
              this.router.navigate([`/dashboard/${this.connectionID}/${this.tablesList[0].table}`], {replaceUrl: true});
              this.selectedTableName = this.tablesList[0].table;
            };
          })
        ).subscribe();
        this._tableRow.cast.subscribe((arg) => {
          if (arg === 'delete row' && this.selectedTableName) {
            this.setTable(this.selectedTableName);
            this.selection.clear();
          };
        });
        this._tables.cast.subscribe((arg) => {
          if (arg === 'delete rows' && this.selectedTableName) {
            this.setTable(this.selectedTableName);
            this.selection.clear();
            console.log('after delete rows');
          };
        });
    }
  }

  getTables() {
    return this._tables.fetchTables(this.connectionID).toPromise();
  }

  formatTableNames(tables: TableProperties[]) {
    this.tablesList = tables.map((tableItem: TableProperties) => {
      if (tableItem.display_name) return {...tableItem}
      else return {...tableItem, normalizedTableName: normalizeTableName(tableItem.table)}
    })
  }

  setTable(tableName: string) {
    this.selectedTableName = tableName;
    this.route.queryParams.pipe(first()).subscribe((queryParams) => {
      this.filters = getFilters(queryParams);
      this.comparators = getComparators(queryParams);
      const search = queryParams.search;
      this.getRows(search);
    })

    const selectedTableProperties = this.tablesList.find( (table: any) => table.table == this.selectedTableName);
    this.selectedTableDisplayName = selectedTableProperties.display_name || normalizeTableName(selectedTableProperties.table);
    this.loading = false;
  }

  openTableFilters(structure) {
    let filterDialodRef = this.dialog.open(DbTableFiltersDialogComponent, {
      width: '56em',
      data: {
        connectionID: this.connectionID,
        tableName: this.selectedTableName,
        displayTableName: this.selectedTableDisplayName,
        structure
      }
    });

    filterDialodRef.afterClosed().subscribe(action => {
      if (action === 'filter' || action === 'reset') {
        const filtersFromDialog = {...filterDialodRef.componentInstance.tableRowFieldsShown};

        const nonEmptyFilters = omitBy(filtersFromDialog, (value) => value === undefined);
        this.comparators = filterDialodRef.componentInstance.tableRowFieldsComparator;

        if (Object.keys(nonEmptyFilters).length) {
          this.filters = Object.keys(nonEmptyFilters)
            .reduce((filtersObj, key) => {
              filtersObj[key] = filtersFromDialog[key].toString().trim();
              return filtersObj;
            }, {});

          const filtersQueryParams = Object.keys(this.filters)
            .reduce((paramsObj, key) => {
              paramsObj[`f__${key}__${this.comparators[key]}`] = this.filters[key];
              return paramsObj;
            }, {});

          this.getRows();
          this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`], { queryParams: {...filtersQueryParams, page_index: 0} });
        }
      }
    })
  }

  removeFilter(columnName: string) {
    this.filters[columnName] = undefined;
    this.filters = omitBy(this.filters, (value) => value === undefined);

    const filtersQueryParams = Object.keys(this.filters)
      .reduce((paramsObj, key) => {
        paramsObj[`f__${key}__${this.comparators[key]}`] = this.filters[key];
        return paramsObj;
      }, {});

      this.getRows();
      this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`], { queryParams: {...filtersQueryParams, page_index: 0} });
  }

  clearAllFilters() {
    this.filters = {};
    this.comparators = {};
    this.getRows();
    this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`], { queryParams: {page_index: 0} });
  }

  search(value: string) {
    this.getRows(value);
    this.filters = {};
    this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`], { queryParams: {page_index: 0, search: value} });
  }

  getRows(search?: string) {
    this.dataSource.fetchRows({
      connectionID: this.connectionID,
      tableName: this.selectedTableName,
      requstedPage: 0,
      sortColumn: undefined,
      sortOrder: undefined,
      filters: this.filters,
      comparators: this.comparators,
      search
    });
  }

  confirmDeleteRows(selectedRows) {
    const primaryKeys = this.getPrimaryKeys(selectedRows);

    this.dialog.open(BbBulkActionConfirmationDialogComponent, {
      width: '25em',
      data: {title: 'delete', primaryKeys}
    });
  }

  openIntercome() {
    // @ts-ignore
    Intercom('show');
  }


  activateAction({action, primaryKeys}: DataToActivateAction) {
    if (action.requireConfirmation) {
      this.dialog.open(DbActionConfirmationDialogComponent, {
        width: '25em',
        data: {id: action.id, title: action.title, primaryKeys}
      });
    } else {
      this._tables.activateAction(this.connectionID, this.selectedTableName, action.id, action.title, primaryKeys)
        .subscribe((res) => {
          if (res.location) this.dialog.open(DbActionLinkDialogComponent, {
            width: '25em',
            data: res.location
          })
        })
    }
  }

  getPrimaryKeys(selectedRows) {
    return selectedRows.map(row => Object.assign({}, ...this.dataSource.keyAttributes.map((primaryKey) => ({[primaryKey.column_name]: row[primaryKey.column_name]}))));
  }

  activateActions({action, selectedRows}: DataToActivateActions) {
    const primaryKeys = this.getPrimaryKeys(selectedRows);

    if (action.requireConfirmation) {
      this.dialog.open(BbBulkActionConfirmationDialogComponent, {
        width: '25em',
        data: {id: action.id, title: action.title, primaryKeys}
      });
    } else {
      this._tables.activateActions(this.connectionID, this.selectedTableName, action.id, action.title, primaryKeys)
        .subscribe(() => {console.log('activated')})
    }
  }
}
