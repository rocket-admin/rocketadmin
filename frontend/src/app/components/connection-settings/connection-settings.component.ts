import { Component, OnDestroy, OnInit, Inject } from '@angular/core';

import { AccessLevel } from 'src/app/models/user';
import { Angulartics2Module, Angulartics2 } from 'angulartics2';
import { CommonModule } from '@angular/common';
import { ConnectionSettings } from 'src/app/models/connection';
import { ConnectionsService } from 'src/app/services/connections.service';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterModule } from '@angular/router';
import { ServerError } from 'src/app/models/alert';
import { Subscription } from 'rxjs';
import { TableProperties } from 'src/app/models/table';
import { TablesService } from 'src/app/services/tables.service';
import { Title } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';
import { normalizeTableName } from '../../lib/normalize'
import { BannerComponent } from '../ui-components/banner/banner.component';
import { PlaceholderConnectionSettingsComponent } from '../skeletons/placeholder-connection-settings/placeholder-connection-settings.component';
import { AlertComponent } from '../ui-components/alert/alert.component';
import { ZapierComponent } from './zapier/zapier.component';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-connection-settings',
  templateUrl: './connection-settings.component.html',
  styleUrls: ['./connection-settings.component.css'],
  imports: [
    CommonModule,
    MatTabsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    BannerComponent,
    PlaceholderConnectionSettingsComponent,
    AlertComponent,
    Angulartics2Module,
    ZapierComponent
  ]
})
export class ConnectionSettingsComponent implements OnInit, OnDestroy {

  public isSaas = (environment as any).saas;
  public connectionID: string | null = null;
  public tablesList: TableProperties[] = null;
  public connectionSettingsInitial: ConnectionSettings = {
    hidden_tables: [],
    default_showing_table: null,
    primary_color: '',
    secondary_color: '',
    logo_url: '',
    company_name: '',
    tables_audit: true,
  };
  public connectionSettings: ConnectionSettings = {...this.connectionSettingsInitial};
  // public hiddenTables: string[];
  public loading: boolean = false;
  public submitting: boolean = false;
  public isSettingsExist: boolean = false;
  public noTablesError: boolean = false;
  public isServerError: boolean = false;
  public serverError: ServerError;

  private getTitleSubscription: Subscription;

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private title: Title,
    @Inject(Angulartics2) private angulartics2: Angulartics2
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
        (err) => {
          this.loading = false;
          this.isServerError = true;
          this.serverError = {abstract: err.error.message, details: err.error.originalMessage};
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
            this.isSettingsExist = true;
          } else {
            this.connectionSettings = {...this.connectionSettingsInitial};
            this.isSettingsExist = false;
            console.log('this.connectionSettings in getSettings else');
            console.log(this.connectionSettings);
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

    const updatedSettings = {}

    for (const [key, value] of Object.entries(this.connectionSettings)) {
      if (key === 'hidden_tables') {
        updatedSettings[key] = value.length > 0;
      } else {
        updatedSettings[key] = Boolean(value);
      }
    }

    this._connections.createConnectionSettings(this.connectionID, this.connectionSettings)
      .subscribe(() => {
        this.getSettings();
        this.submitting = false;
        this.angulartics2.eventTrack.next({
          action: 'Connection settings: settings is created successfully',
          properties: updatedSettings
        });
      },
      () => this.submitting = false,
      () => this.submitting = false
    );
  }

  updateSettings() {
    this.submitting = true;

    const updatedSettings = {}

    for (const [key, value] of Object.entries(this.connectionSettings)) {
      if (key === 'hidden_tables') {
        updatedSettings[key] = value.length > 0;
      } else {
        updatedSettings[key] = Boolean(value);
      }
    }

    this._connections.updateConnectionSettings(this.connectionID, this.connectionSettings)
      .subscribe(() => {
        this.getSettings();
        this.submitting = false;
        this.angulartics2.eventTrack.next({
          action: 'Connection settings: settings is updated successfully',
          properties: updatedSettings
        });
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
        this.angulartics2.eventTrack.next({
          action: 'Connection settings: settings is reset successfully',
        });
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
