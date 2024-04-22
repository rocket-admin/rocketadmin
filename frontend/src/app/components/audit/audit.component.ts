import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription, merge } from 'rxjs';

import { AuditDataSource } from './audit-data-source';
import { ConnectionsService } from 'src/app/services/connections.service';
import { InfoDialogComponent } from './info-dialog/info-dialog.component';
import { Log } from 'src/app/models/logs';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { ServerError } from 'src/app/models/alert';
import { TableProperties } from 'src/app/models/table';
import { TablesService } from 'src/app/services/tables.service';
import { Title } from '@angular/platform-browser';
import { User } from '@sentry/angular-ivy';
import { UsersService } from 'src/app/services/users.service';
import { tap } from 'rxjs/operators';
import { normalizeTableName } from 'src/app/lib/normalize';

@Component({
  selector: 'app-audit',
  templateUrl: './audit.component.html',
  styleUrls: ['./audit.component.css']
})
export class AuditComponent implements OnInit, OnDestroy {
  public connectionID: string;
  public accesLevel: string;
  public columns: string[];
  public dataColumns: string[];
  public tablesList: TableProperties[] = null;
  public tableName: string = 'showAll';
  public usersList: User[];
  public userEmail: string = 'showAll';
  public isServerError: boolean = false;
  public serverError: ServerError;
  public noTablesError: boolean = false;

  public dataSource: AuditDataSource = null;
  private getTitleSubscription: Subscription;

  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private _users: UsersService,
    public dialog: MatDialog,
    private title: Title
  ) { }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;

    merge(this.paginator.page)
        .pipe(
            tap(() => this.loadLogsPage())
        )
        .subscribe();
  }

  ngOnInit(): void {
    this.getTitleSubscription = this._connections.getCurrentConnectionTitle().subscribe(connectionTitle => {
      this.title.setTitle(`Audit - ${connectionTitle} | Rocketadmin`);
    });
    this.connectionID = this._connections.currentConnectionID;
    this.accesLevel = this._connections.currentConnectionAccessLevel;
    this.columns = ['Table', 'User', 'Action', 'Date', 'Status', 'Details'];
    this.dataColumns = ['Table', 'User', 'Action', 'Date', 'Status'];
    this.dataSource = new AuditDataSource(this._connections);
    this.loadLogsPage();

    this._tables.fetchTables(this.connectionID)
      .subscribe(
        res => {
        if (res.length) {
          this.tablesList = res.map((tableItem: TableProperties) => {
            if (tableItem.display_name) return {...tableItem}
            else return {...tableItem, normalizedTableName: normalizeTableName(tableItem.table)}
          });
        };
        this.noTablesError = (res.length === 0)
      },
      (err) => {
        this.isServerError = true;
        this.serverError = {abstract: err.error.message, details: err.error.originalMessage};
      })

    if (this.accesLevel !== 'none') this._users.fetchConnectionUsers(this.connectionID)
      .subscribe(res => {
        this.usersList = res;
      })
  }

  ngOnDestroy() {
    this.getTitleSubscription.unsubscribe();
  }

  loadLogsPage() {
    this.dataSource.fetchLogs({
      connectionID: this.connectionID,
      tableName: this.tableName,
      userEmail: this.userEmail
    });
  }

  openInfoLogDialog(log: Log) {
    this.dialog.open(InfoDialogComponent, {
      width: '50em',
      data: log
    })
  }

  openIntercome() {
    // @ts-ignore
    Intercom('show');
  }
}
