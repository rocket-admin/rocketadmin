import { Component, OnDestroy, OnInit } from '@angular/core';

import { AccessLevel } from 'src/app/models/user';
import { ConnectionSettings } from 'src/app/models/connection';
import { ConnectionsService } from 'src/app/services/connections.service';
import { Subscription } from 'rxjs';
import { TableProperties } from 'src/app/models/table';
import { TablesService } from 'src/app/services/tables.service';
import { Title } from '@angular/platform-browser';
import { normalizeTableName } from '../../lib/normalize'

@Component({
  selector: 'app-connection-settings',
  templateUrl: './connection-settings.component.html',
  styleUrls: ['./connection-settings.component.css']
})
export class ConnectionSettingsComponent implements OnInit, OnDestroy {

  public connectionID: string | null = null;
  public tablesList: TableProperties[] = null;
  public connectionSettings: ConnectionSettings = {
    hidden_tables: [],
    primary_color: '',
    secondary_color: '',
    logo_url: '',
    company_name: '',
  };
  // public hiddenTables: string[];
  public loading: boolean = false;
  public submitting: boolean = false;
  public isSettingsExist: boolean = false;
  public noTablesError: boolean = false;
  public errorMessage: string;

  private getTitleSubscription: Subscription;

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private title: Title
  ) { }

  ngOnInit(): void {
    this.getTitleSubscription = this._connections.getCurrentConnectionTitle().subscribe(connectionTitle => {
      this.title.setTitle(`Settings - ${connectionTitle} | Rocketadmin`);
    });

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

  ngOnDestroy() {
    this.getTitleSubscription.unsubscribe();
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
            this.connectionSettings = {...res};
            console.log('connectionSettings from getSettings');
            console.log(this.connectionSettings);
            this.isSettingsExist = true;
          } else {
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
    this._connections.createConnectionSettings(this.connectionID, this.connectionSettings)
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
    this._connections.updateConnectionSettings(this.connectionID, this.connectionSettings)
      .subscribe(() => {
        this.getSettings();
        this.submitting = false;
      },
      () => this.submitting = false,
      () => this.submitting = false
    );
  }

  resetSettings() {
    this.submitting = true;
    this._connections.deleteConnectionSettings(this.connectionID)
      .subscribe(() => {
        this.getSettings();
        this.submitting = false;
      },
      () => this.submitting = false,
      () => this.submitting = false
    );
  }


  onFileSelected(event) {
    let reader = new FileReader();
    const file:File = event.target.files[0];

    reader.addEventListener("load", () => {

    }, false);

    reader.readAsArrayBuffer(file);
  }

  openIntercome() {
    // @ts-ignore
    Intercom('show');
  }
}
