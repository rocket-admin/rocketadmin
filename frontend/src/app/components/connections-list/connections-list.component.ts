import { Component, OnInit } from '@angular/core';

import { Connection, ConnectionItem } from 'src/app/models/connection';
import { ConnectionsService } from 'src/app/services/connections.service';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from 'src/app/services/user.service';
import { CompanyService } from 'src/app/services/company.service';
import { User } from 'src/app/models/user';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { UiSettings } from 'src/app/models/ui-settings';

@Component({
  selector: 'app-connections-list',
  templateUrl: './connections-list.component.html',
  styleUrls: ['./connections-list.component.css']
})
export class ConnectionsListComponent implements OnInit {

  public connections: ConnectionItem[] = null;
  public testConnections: ConnectionItem[] = null;
  public titles: Object;
  public displayedCardCount: number = 3;
  public connectionsListCollapsed: boolean = true;
  public companyName: string;
  public currentUser: User;

  constructor(
    private _connectionsServise: ConnectionsService,
    public deleteDialog: MatDialog,
    private _userService: UserService,
    private _companyService: CompanyService,
    private _uiSettings: UiSettingsService,
  ) { }

  ngOnInit(): void {
    this._userService.cast.subscribe(user => {
      this.currentUser = user;
      user.id && this._companyService.fetchCompanyName(user.company.id)
      .subscribe((res: any) => {
        this.companyName = res.name;
      })
    });
    this._uiSettings.cast
      .subscribe( (settings: UiSettings) => {
        this.connectionsListCollapsed = settings?.globalSettings?.connectionsListCollapsed;
    });
    this._connectionsServise.fetchConnections()
      .subscribe((res: any) => {
        this.setConnections(res);
      })
  }

  setConnections(res) {
    this.connections = res.connections.filter(connectionItem => !connectionItem.connection.isTestConnection);
    this.testConnections = res.connections.filter(connectionItem => connectionItem.connection.isTestConnection);
    this.titles = Object.assign({}, ...res.connections.map((connectionItem) => ({[connectionItem.connection.id]: this.getTitle(connectionItem.connection)})));
    this.displayedCardCount = this.connectionsListCollapsed ? 3 : this.connections.length;
  }

  getTitle(connection: Connection) {
    if (!connection.title && connection.masterEncryption) return 'Untitled encrypted connection'
    return connection.title || connection.database
  }

  showMore() {
    this.displayedCardCount = this.connections.length;
    this._uiSettings.updateGlobalSetting('connectionsListCollapsed', false);
  }

  showLess() {
    this.displayedCardCount = 3;
    this._uiSettings.updateGlobalSetting('connectionsListCollapsed', true);
  }
}
