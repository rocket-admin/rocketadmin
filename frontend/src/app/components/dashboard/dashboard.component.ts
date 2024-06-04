import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { ConnectionSettingsUI, UiSettings } from 'src/app/models/ui-settings';
import { CustomAction, TableProperties } from 'src/app/models/table';
import { first, map } from 'rxjs/operators';

import { Angulartics2 } from 'angulartics2';
import { BbBulkActionConfirmationDialogComponent } from './db-bulk-action-confirmation-dialog/db-bulk-action-confirmation-dialog.component';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DbTableFiltersDialogComponent } from './db-table-filters-dialog/db-table-filters-dialog.component';
import { HttpErrorResponse } from '@angular/common/http';
import JsonURL from "@jsonurl/jsonurl";
import { MatDialog } from '@angular/material/dialog';
import { SelectionModel } from '@angular/cdk/collections';
import { ServerError } from 'src/app/models/alert';
import { TableRowService } from 'src/app/services/table-row.service';
import { TablesDataSource } from './db-tables-data-source';
import { TablesService } from 'src/app/services/tables.service';
import { Title } from '@angular/platform-browser';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { User } from 'src/app/models/user';
import { getComparatorsFromUrl } from 'src/app/lib/parse-filter-params';
import { normalizeTableName } from '../../lib/normalize'
import { omitBy } from "lodash";
import { TableStateService } from 'src/app/services/table-state.service';
import { DbActionLinkDialogComponent } from './db-action-link-dialog/db-action-link-dialog.component';

interface DataToActivateActions {
  action: CustomAction,
  primaryKeys: object[],
  identityFieldValues: string[]
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
  public currentPage: number = 1;
  public shownTableTitles: boolean = true;
  public connectionID: string;
  public filters: object = {};
  public comparators: object;

  public loading: boolean = true;
  public isServerError: boolean = false;
  public serverError: ServerError;

  public noTablesError: boolean = false;

  public dataSource: TablesDataSource = null;

  public selection = new SelectionModel<any>(true, []);

  public selectedRow = null;

  public uiSettings: ConnectionSettingsUI;

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private _tableRow: TableRowService,
    private _uiSettings: UiSettingsService,
    private _tableState: TableStateService,
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

  ngOnInit() {
    this.connectionID = this._connections.currentConnectionID;
    this.dataSource = new TablesDataSource(this._tables, this._connections, this._uiSettings);

    this._tableState.cast.subscribe(row => {
      this.selectedRow = row;
    });

    this._uiSettings.getUiSettings()
      .subscribe ((settings: UiSettings) => {
        this.uiSettings = settings?.connections[this.connectionID];
        this.shownTableTitles = settings?.connections[this.connectionID]?.shownTableTitles ?? true;

        this.getData();
    });
  }

  async getData() {
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
          if ((arg === 'delete rows' || arg === 'import') && this.selectedTableName) {
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
      this.filters = JsonURL.parse( queryParams.filters );
      this.comparators = getComparatorsFromUrl(this.filters);
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
          this.filters = {};
          for (const key in nonEmptyFilters) {
              if (this.comparators[key] !== undefined) {
                this.filters[key] = {
                      [this.comparators[key]]: nonEmptyFilters[key]
                  };
              }
          }

          const filters = JsonURL.stringify( this.filters );

          this.getRows();
          this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`], { queryParams: {filters, page_index: 0} });
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

    const filters = JsonURL.stringify( this.filters );

    this.getRows();
    this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`], { queryParams: {filters, page_index: 0} });
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
    this._uiSettings.getUiSettings()
      .subscribe ((settings: UiSettings) => {
        this.uiSettings = settings?.connections[this.connectionID];
        this.shownTableTitles = settings?.connections[this.connectionID]?.shownTableTitles ?? true;

        const shownColumns = this.uiSettings?.tables[this.selectedTableName]?.shownColumns;
        this.dataSource.fetchRows({
          connectionID: this.connectionID,
          tableName: this.selectedTableName,
          requstedPage: 0,
          sortColumn: undefined,
          sortOrder: undefined,
          filters: this.filters,
          search,
          shownColumns
        });
    });

  }

  openIntercome() {
    // @ts-ignore
    Intercom('show');
  }

  activateActions({action, primaryKeys, identityFieldValues}: DataToActivateActions) {
    if (action.requireConfirmation) {
      this.dialog.open(BbBulkActionConfirmationDialogComponent, {
        width: '25em',
        data: {id: action.id, title: action.title, primaryKeys, identityFieldValues, tableDisplayName: this.selectedTableDisplayName}
      });
    } else {
      this._tables.activateActions(this.connectionID, this.selectedTableName, action.id, action.title, primaryKeys)
        .subscribe((res) => {
          if (res && res.location) this.dialog.open(DbActionLinkDialogComponent, {
            width: '25em',
            data: {href: res.location, actionName: action.title, primaryKeys: primaryKeys[0]}
          })
        })
    }
  }

  toggleSideBar() {
    this.shownTableTitles = !this.shownTableTitles;
    this._uiSettings.updateConnectionSetting(this.connectionID, 'shownTableTitles', this.shownTableTitles);
  }
}
