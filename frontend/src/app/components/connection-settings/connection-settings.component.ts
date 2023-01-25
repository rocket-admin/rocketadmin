import { Component, OnInit } from '@angular/core';
import { TableProperties } from 'src/app/models/table';
import { AccessLevel } from 'src/app/models/user';
import { ConnectionsService } from 'src/app/services/connections.service';
import { TablesService } from 'src/app/services/tables.service';
import { normalizeTableName } from '../../lib/normalize'

@Component({
  selector: 'app-connection-settings',
  templateUrl: './connection-settings.component.html',
  styleUrls: ['./connection-settings.component.css']
})
export class ConnectionSettingsComponent implements OnInit {

  public connectionID: string | null = null;
  public tablesList: TableProperties[] = null;
  public hiddenTables: string[];
  public loading: boolean = false;
  public submitting: boolean = false;
  public isSettingsExist: boolean = false;
  public noTablesError: boolean = false;
  public errorMessage: string;
  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
  ) { }

  ngOnInit(): void {
    this.connectionID = this._connections.currentConnectionID;

    this.loading = true;

    this._tables.fetchTables(this.connectionID, true)
      .subscribe(
        res => {
          if (res.length) {
            this.tablesList = res.map((tableItem: TableProperties) => {
              if (tableItem.display_name) return {...tableItem}
              else return {...tableItem, normalizedTableName: normalizeTableName(tableItem.table)}
            });
          } else {
            this.noTablesError = true;
            // this.tablesList = res;
          }
          this.getSettings();
        },
        (error) => {
          this.loading = false;
          this.errorMessage = error.error.message;
          // this.dbFetchError = true;
          // this.errorMessage = error.error.message;
        }
      )
  }

  get connectionName() {
    return this._connections.currentConnection.title || this._connections.currentConnection.database;
  }

  get accessLevel():AccessLevel {
    return this._connections.currentConnectionAccessLevel
  }

  getSettings() {
    this._connections.getConnectionSettings(this.connectionID)
      .subscribe(
        (res: any) => {
          if (res) {
            this.hiddenTables = res.hidden_tables;
            this.isSettingsExist = true;
          } else {
            this.hiddenTables = [];
            this.isSettingsExist = false;
          }
          this.loading = false;
        }
      );
  }

  handleSettingsSubmitting() {
    if (this.isSettingsExist) {
      this.updateSettings();
    } else {
      this.createSettings();
    }
  }

  createSettings() {
    this.submitting = true;
    this._connections.createConnectionSettings(this.connectionID, this.hiddenTables)
      .subscribe(() => {
        this.getSettings();
        this.submitting = false;
      },
      () => this.submitting = false,
      () => this.submitting = false
      );
  }

  updateSettings() {
    this.submitting = true;
    this._connections.updateConnectionSettings(this.connectionID, this.hiddenTables)
      .subscribe(() => {
        this.getSettings();
        this.submitting = false;
      },
      () => this.submitting = false,
      () => this.submitting = false);
  }

  resetSettings() {
    this.submitting = true;
    this._connections.deleteConnectionSettings(this.connectionID)
      .subscribe(() => {
        this.getSettings();
        this.submitting = false;
      },
      () => this.submitting = false,
      () => this.submitting = false);
  }

  openIntercome() {
    // @ts-ignore
    Intercom('show');
  }
}
