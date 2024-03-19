import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { CustomAction, CustomActionType, TableProperties } from 'src/app/models/table';
import { first, map } from 'rxjs/operators';
import { getComparators, getFilters } from 'src/app/lib/parse-filter-params';

import { Angulartics2 } from 'angulartics2';
import { BbBulkActionConfirmationDialogComponent } from './db-bulk-action-confirmation-dialog/db-bulk-action-confirmation-dialog.component';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DbActionConfirmationDialogComponent } from './db-action-confirmation-dialog/db-action-confirmation-dialog.component';
import { DbActionLinkDialogComponent } from './db-action-link-dialog/db-action-link-dialog.component';
import { DbTableFiltersDialogComponent } from './db-table-filters-dialog/db-table-filters-dialog.component';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { NotificationsService } from 'src/app/services/notifications.service';
import { SelectionModel } from '@angular/cdk/collections';
import { ServerError } from 'src/app/models/alert';
import { TableRowService } from 'src/app/services/table-row.service';
import { TablesDataSource } from './db-tables-data-source';
import { TablesService } from 'src/app/services/tables.service';
import { Title } from '@angular/platform-browser';
import { User } from 'src/app/models/user';
import { normalizeTableName } from '../../lib/normalize'
import { omitBy } from "lodash";

interface DataToActivateActions {
  action: CustomAction,
  selectedRows: object[],
}

interface DataToActivateAction {
  action: CustomAction,
  primaryKeys: object
  identityFieldValue: string
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
  public isServerError: boolean = false;
  public serverError: ServerError;

  public noTablesError: boolean = false;

  public dataSource: TablesDataSource = null;

  public selection = new SelectionModel<any>(true, []);

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private _notifications: NotificationsService,
    private _tableRow: TableRowService,
    public router: Router,
    private route: ActivatedRoute,
    public dialog: MatDialog,
    private title: Title,
    private angulartics2: Angulartics2,
  ) {}

  get currentConnectionAccessLevel () {
    return this._connections.currentConnectionAccessLevel
  }

  get currentConnectionTitle () {
    return this._connections.currentConnection.title || this._connections.currentConnection.database || 'Tables'
  }

  async ngOnInit() {
    this.connectionID = this._connections.currentConnectionID;
    this.dataSource = new TablesDataSource(this._tables, this._notifications, this._connections);
    const isTitlesShown = localStorage.getItem(`shownTableTitles__${this.connectionID}`);
    if (isTitlesShown === null) {
      this.shownTableTitles = true
    } else {
      this.shownTableTitles = localStorage.getItem(`shownTableTitles__${this.connectionID}`) === 'true';
    };

    let tables;
    try {
      tables = await this.getTables();
    } catch(err) {
      this.loading = false;
      this.isServerError = true;
      this.title.setTitle('Dashboard | Rocketadmin');

      if (err instanceof HttpErrorResponse) {
        this.serverError = {abstract: err.error.message || err.message, details: err.error.originalMessage};
      } else  { throw err };
    }

    if (tables && tables.length === 0) {
      this.noTablesError = true;
      this.loading = false;
      this.title.setTitle('No tables | Rocketadmin');
    } else if (tables) {
      this.formatTableNames(tables);
      this.route.paramMap
        .pipe(
          map((params: ParamMap) => {
            const tableName = params.get('table-name');
            if (tableName) {
              this.selectedTableName = tableName;
              this.setTable(tableName);
              this.title.setTitle(`${this.selectedTableDisplayName} table | Rocketadmin`);
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
          };
          if (arg === 'activate actions') {
            this.selection.clear();
          }
        });
    }
  }

  getTables() {
    return this._tables.fetchTables(this.connectionID).toPromise();
  }

  formatTableNames(tables: TableProperties[]) {
    this.tablesList = tables.map((tableItem: TableProperties) => {
      let normalizedTableName;
      if (tableItem.display_name) {
        normalizedTableName = tableItem.display_name;
      } else {
        normalizedTableName = normalizeTableName(tableItem.table);
      };
      const words = normalizedTableName.split(' ');
      const initials = words.reduce((result, word) => {
        if (word.length > 0) {
          return result + word[0].toUpperCase();
        }
        return result;
      }, '');

      if (tableItem.display_name) return {...tableItem, initials: initials.slice(0, 2)}
      else return {...tableItem, normalizedTableName, initials: initials.slice(0, 2)}
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
    if (selectedTableProperties) {
      this.selectedTableDisplayName = selectedTableProperties.display_name || normalizeTableName(selectedTableProperties.table);
    } else {
      return;
    }
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
      if (action === 'filter') {
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
          this.angulartics2.eventTrack.next({
            action: 'Dashboard: filter is applied',
          });
        }
      } else if (action === 'reset') {
        this.filters = {};
        this.getRows();
        this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`]);
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

  openIntercome() {
    // @ts-ignore
    Intercom('show');
  }

  activateAction({action, primaryKeys, identityFieldValue}: DataToActivateAction) {
    if (action.requireConfirmation) {
      if (action.type === CustomActionType.Single || action.title === 'Delete row') {
        this.dialog.open(DbActionConfirmationDialogComponent, {
          width: '25em',
          data: {id: action.id, title: action.title, primaryKeys, identityFieldValue, tableDisplayName: this.selectedTableDisplayName}
        });
      } else if (action.type === CustomActionType.Multiple) {
        this.dialog.open(BbBulkActionConfirmationDialogComponent, {
          width: '25em',
          data: {id: action.id, title: action.title, primaryKeys: [primaryKeys], identityFieldValues: [identityFieldValue], tableDisplayName: this.selectedTableDisplayName}
        });
      }
    } else {
      if (action.type === CustomActionType.Single) {
        this._tables.activateAction(this.connectionID, this.selectedTableName, action.id, action.title, primaryKeys)
        .subscribe((res) => {
          if (res && res.location) this.dialog.open(DbActionLinkDialogComponent, {
            width: '25em',
            data: {href: res.location, actionName: action.title, primaryKeys, identityFieldValue, tableDisplayName: this.selectedTableDisplayName}
          })
        })
      } else if (action.type === CustomActionType.Multiple) {
        this._tables.activateActions(this.connectionID, this.selectedTableName, action.id, action.title, [primaryKeys])
          .subscribe(() => {console.log('activated')})
      }
    }
  }

  getPrimaryKeys(selectedRows) {
    return selectedRows.map(row => Object.assign({}, ...this.dataSource.keyAttributes.map((primaryKey) => ({[primaryKey.column_name]: row[primaryKey.column_name]}))));
  }

  activateActions({action, selectedRows}: DataToActivateActions) {
    const primaryKeys = this.getPrimaryKeys(selectedRows);

    let identityFieldValues = null;
    if (this.dataSource.identityColumn) identityFieldValues = selectedRows.map(row => row[this.dataSource.identityColumn]);

    if (action.requireConfirmation) {
      this.dialog.open(BbBulkActionConfirmationDialogComponent, {
        width: '25em',
        data: {id: action.id, title: action.title, primaryKeys, identityFieldValues, tableDisplayName: this.selectedTableDisplayName}
      });
    } else {
      this._tables.activateActions(this.connectionID, this.selectedTableName, action.id, action.title, primaryKeys)
        .subscribe(() => {console.log('activated')})
    }
  }

  toggleSideBar() {
    this.shownTableTitles = !this.shownTableTitles;
    localStorage.setItem(`shownTableTitles__${this.connectionID}`, `${this.shownTableTitles}`);
  }
}
