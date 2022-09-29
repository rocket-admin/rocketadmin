import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { first, map } from 'rxjs/operators';
import { getComparators, getFilters } from 'src/app/lib/parse-filter-params';

import { ConnectionsService } from 'src/app/services/connections.service';
import { DbRowDeleteDialogComponent } from './db-row-delete-dialog/db-row-delete-dialog.component';
import { DbTableFiltersDialogComponent } from './db-table-filters-dialog/db-table-filters-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { NotificationsService } from 'src/app/services/notifications.service';
import { TableProperties } from 'src/app/models/table';
import { TableRowService } from 'src/app/services/table-row.service';
import { TablesDataSource } from './db-tables-data-source';
import { TablesService } from 'src/app/services/tables.service';
import { User } from 'src/app/models/user';
import { normalizeTableName } from '../../lib/normalize'
import { HttpErrorResponse } from '@angular/common/http';
import { omitBy } from "lodash";

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
  public filtersCount: number;

  public loading: boolean = true;
  public dbFetchError: boolean = false;
  public errorMessage: string;

  public noTablesError: boolean = false;

  public dataSource: TablesDataSource = null;

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
      // @ts-ignore
      Intercom('show');
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
            } else {
              this.router.navigate([`/dashboard/${this.connectionID}/${this.tablesList[0].table}`], {replaceUrl: true})
                .then(() => this.selectedTableName = this.tablesList[0].table);
            };
          })
        ).subscribe();
        this._tableRow.cast.subscribe((arg) => {
          if (arg === 'delete row' && this.selectedTableName) {
            this.setTable(this.selectedTableName);
          };
        });
    }
  }

  getTables() {
    return this._tables.fetchTables(this.connectionID).toPromise();
  }

  formatTableNames(tables) {
    this.tablesList = tables.map((tableItem: TableProperties) => {
      if (tableItem.display_name) return {...tableItem}
      else return {...tableItem, normalizedTableName: normalizeTableName(tableItem.table)}
    })
  }

  setTable(tableName: string) {
    this.selectedTableName = tableName;
    this.route.queryParams.pipe(first()).subscribe((queryParams) => {
      const filters = getFilters(queryParams);
      const comparators = getComparators(queryParams);

      this.filtersCount = Object.keys(filters).length;
      this.dataSource.fetchRows({
        connectionID: this.connectionID,
        tableName: tableName,
        requstedPage: parseInt(queryParams.page_index, 10),
        sortColumn: undefined,
        sortOrder: undefined,
        filters: filters,
        comparators: comparators,
      });
    })
    const selectedTableProperties = this.tablesList.find( (table: any) => table.table == this.selectedTableName);
    this.selectedTableDisplayName = selectedTableProperties.display_name || normalizeTableName(selectedTableProperties.table);
    // this.selectedTablePermissions = selectedTableProperties.permissions;
    this.loading = false;
  }

  openTableFilters() {
    let filterDialodRef = this.dialog.open(DbTableFiltersDialogComponent, {
      width: '50em',
      height: '40em',
      data: {
        connectionID: this.connectionID,
        tableName: this.selectedTableName,
        displayTableName: this.selectedTableDisplayName
      }
    });
    filterDialodRef.componentInstance.tableRowFieldsShown

    filterDialodRef.afterClosed().subscribe(action => {
      console.log(filterDialodRef.componentInstance.tableRowFieldsShown);
      const filters = omitBy(filterDialodRef.componentInstance.tableRowFieldsShown, (value) => value === undefined);
      console.log(filters);
      const comparators = filterDialodRef.componentInstance.tableRowFieldsComparator;

      const filtersQueryParams = Object.keys(filters)
        .reduce((paramsObj, key) => {
          paramsObj[`f__${key}__${comparators[key]}`] = filters[key];
          return paramsObj;
        }, {});
      if (action === 'filter' || action === 'reset') {
        this.filtersCount = Object.keys(filters).length;
        this.dataSource.fetchRows({
          connectionID: this.connectionID,
          tableName: this.selectedTableName,
          requstedPage: 0,
          sortColumn: undefined,
          sortOrder: undefined,
          filters: filters,
          comparators: comparators
        });
        this.router.navigate([`/dashboard/${this.connectionID}/${this.selectedTableName}`], { queryParams: {...filtersQueryParams, page_index: 0} });
      }
    })
  }

  confirmDeleteRow(rowKeyAttributes: Object) {
    this.dialog.open(DbRowDeleteDialogComponent, {
      width: '25em',
      data: rowKeyAttributes
    });
  }
}
