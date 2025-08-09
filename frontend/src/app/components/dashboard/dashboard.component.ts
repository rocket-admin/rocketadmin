import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Angulartics2, Angulartics2Module } from 'angulartics2';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ConnectionSettingsUI, UiSettings } from 'src/app/models/ui-settings';
import { CustomEvent, TableProperties } from 'src/app/models/table';
import { first, map } from 'rxjs/operators';

import { AlertComponent } from '../ui-components/alert/alert.component';
import { BannerComponent } from '../ui-components/banner/banner.component';
import { BbBulkActionConfirmationDialogComponent } from './db-table-view/db-bulk-action-confirmation-dialog/db-bulk-action-confirmation-dialog.component';
import { CommonModule } from '@angular/common';
import { CompanyService } from 'src/app/services/company.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { ContentLoaderComponent } from '../ui-components/content-loader/content-loader.component';
import { DbActionLinkDialogComponent } from './db-table-view/db-action-link-dialog/db-action-link-dialog.component';
import { DbTableAiPanelComponent } from './db-table-view/db-table-ai-panel/db-table-ai-panel.component';
import { DbTableFiltersDialogComponent } from './db-table-view/db-table-filters-dialog/db-table-filters-dialog.component';
import { DbTableRowViewComponent } from './db-table-view/db-table-row-view/db-table-row-view.component';
import { DbTableViewComponent } from './db-table-view/db-table-view.component';
import { DbTablesListComponent } from './db-tables-list/db-tables-list.component';
import { HttpErrorResponse } from '@angular/common/http';
import JsonURL from "@jsonurl/jsonurl";
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { PlaceholderTableViewComponent } from '../skeletons/placeholder-table-view/placeholder-table-view.component';
import { RouterModule } from '@angular/router';
import { SelectionModel } from '@angular/cdk/collections';
import { ServerError } from 'src/app/models/alert';
import { TableRowService } from 'src/app/services/table-row.service';
import { TableStateService } from 'src/app/services/table-state.service';
import { TablesDataSource } from './db-tables-data-source';
import { TablesService } from 'src/app/services/tables.service';
import { Title } from '@angular/platform-browser';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { User } from 'src/app/models/user';
import { environment } from 'src/environments/environment';
import { getComparatorsFromUrl } from 'src/app/lib/parse-filter-params';
import { normalizeTableName } from '../../lib/normalize'
import { omitBy } from "lodash";

interface DataToActivateActions {
  action: CustomEvent,
  primaryKeys: object[],
  identityFieldValues: string[]
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSidenavModule,
    DbTablesListComponent,
    DbTableViewComponent,
    DbTableAiPanelComponent,
    DbTableRowViewComponent,
    AlertComponent,
    ContentLoaderComponent,
    PlaceholderTableViewComponent,
    BannerComponent,
    RouterModule,
    Angulartics2Module
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {

  public isSaas = (environment as any).saas;
  public user: User = null;
  public tablesList: TableProperties[] = null;
  public selectedTableName: string;
  public selectedTableDisplayName: string;
  public currentPage: number = 1;
  public shownTableTitles: boolean = true;
  public connectionID: string;
  // public isTestConnection: boolean = false;
  public filters: object = {};
  public comparators: object;
  public pageIndex: number;
  public pageSize: number;
  public sortColumn: string;
  public sortOrder: 'ASC' | 'DESC';

  public loading: boolean = true;
  public isServerError: boolean = false;
  public serverError: ServerError;

  public noTablesError: boolean = false;

  public dataSource: TablesDataSource = null;

  public selection = new SelectionModel<any>(true, []);

  public selectedRow = null;
  public isAIpanelOpened: boolean = false;

  public uiSettings: ConnectionSettingsUI;

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private _tableRow: TableRowService,
    private _uiSettings: UiSettingsService,
    private _tableState: TableStateService,
    private _company: CompanyService,
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

  get currentConnectionIsTest () {
    return this._connections.currentConnection.isTestConnection
  }

  get defaultTableToOpen () {
    return this._connections.defaultTableToOpen;
  }

  ngOnInit() {
    this.connectionID = this._connections.currentConnectionID;
    // this.isTestConnection = this._connections.currentConnection.isTestConnection;
    this.dataSource = new TablesDataSource(this._tables, this._connections, this._uiSettings, this._tableRow);

    this._tableState.cast.subscribe(row => {
      this.selectedRow = row;
    });

    this._tableState.aiPanelCast.subscribe(isAIpanelOpened => {
      this.isAIpanelOpened = isAIpanelOpened;
    });

    this._uiSettings.getUiSettings()
      .subscribe ((settings: UiSettings) => {
        this.uiSettings = settings?.connections[this.connectionID];
        this.shownTableTitles = settings?.connections[this.connectionID]?.shownTableTitles ?? true;

        this.getData();
    });
  }

  ngOnDestroy() {
    this._tableState.clearSelection();
  }

  async getData() {
    let tables;
    try {
      tables = await this.getTables();
    } catch(err) {
      this.loading = false;
      this.isServerError = true;
      this.title.setTitle(`Dashboard | ${this._company.companyTabTitle || 'Rocketadmin'}`);

      if (err instanceof HttpErrorResponse) {
        this.serverError = {abstract: err.error.message || err.message, details: err.error.originalMessage};
      } else  { throw err };
    }

    if (tables && tables.length === 0) {
      this.noTablesError = true;
      this.loading = false;
      this.title.setTitle(`No tables | ${this._company.companyTabTitle || 'Rocketadmin'}`);
    } else if (tables) {
      this.formatTableNames(tables);
      this.route.paramMap
        .pipe(
          map((params: ParamMap) => {
            let tableName = params.get('table-name');
            if (tableName) {
              this.selectedTableName = tableName;
              this.setTable(tableName);
              this.title.setTitle(`${this.selectedTableDisplayName} table | ${this._company.companyTabTitle || 'Rocketadmin'}`);
              this.selection.clear();
            } else {
              if (this.defaultTableToOpen) {
                tableName = this.defaultTableToOpen
              } else {
                tableName = this.tablesList[0].table;
              };
              this.router.navigate([`/dashboard/${this.connectionID}/${tableName}`], {replaceUrl: true});
              this.selectedTableName = tableName;
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
      this.pageIndex = parseInt(queryParams.page_index) || 0;
      this.pageSize = parseInt(queryParams.page_size) || 30;
      this.sortColumn = queryParams.sort_active;
      this.sortOrder = queryParams.sort_direction;

      const search = queryParams.search;
      this.getRows(search);
      console.log('getRows from setTable');
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

        console.log('Filters from dialog:', filtersFromDialog);

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

          console.log('Filters to apply:', this.filters);

          const filters = JsonURL.stringify( this.filters );

          console.log('Filters to navigate:', filters);

          this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`], {
            queryParams: {
              filters,
              page_index: 0,
              page_size: this.pageSize
            }
          });
          this.getRows();
          console.log('getRows from afterClosed');


          this.angulartics2.eventTrack.next({
            action: 'Dashboard: filter is applied',
          });
        }
      } else if (action === 'reset') {
        this.filters = {};
        this.getRows();
        console.log('getRows from reset filters afterClosed');
        this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`]);
      }
    })
  }

  removeFilter(columnName: string) {
    this.filters[columnName] = undefined;
    this.filters = omitBy(this.filters, (value) => value === undefined);

    const filters = JsonURL.stringify( this.filters );

    this.selection.clear();

    this.getRows();
    console.log('getRows from removeFilter');
    this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`], {
      queryParams: {
        filters,
        page_index: 0,
        page_size: this.pageSize
      }
    });
  }

  clearAllFilters() {
    this.filters = {};
    this.comparators = {};
    this.getRows();
    console.log('getRows from clearAllFilters');
    this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`], {
      queryParams: {
        page_index: 0,
        page_size: this.pageSize
      }
    });
  }

  search(value: string) {
    this.getRows(value);
    console.log('getRows from search');
    this.filters = {};
    this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`], {
      queryParams: {
        page_index: 0,
        page_size: this.pageSize,
        search: value
      }
    });
  }

  getRows(search?: string) {
    console.log('getRows, filters:', this.filters);
    this._uiSettings.getUiSettings()
      .subscribe ((settings: UiSettings) => {
        this.uiSettings = settings?.connections[this.connectionID];
        this.shownTableTitles = settings?.connections[this.connectionID]?.shownTableTitles ?? true;

        const shownColumns = this.uiSettings?.tables[this.selectedTableName]?.shownColumns;
        this.dataSource.fetchRows({
          connectionID: this.connectionID,
          tableName: this.selectedTableName,
          requstedPage: this.pageIndex,
          pageSize: this.pageSize,
          sortColumn: this.sortColumn,
          sortOrder: this.sortOrder,
          filters: this.filters,
          search,
          shownColumns
        });
    });
  }

  applyFilter(filters: any) {
    console.log('applyFilter with filters:', filters);
    this.filters = filters?.filters;
    this.getRows();
    console.log('getRows from applyFilter');
  }

  openIntercome() {
    // @ts-ignore
    Intercom('show');
  }

  activateActions({action, primaryKeys, identityFieldValues}: DataToActivateActions) {
    if (action.require_confirmation) {
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
