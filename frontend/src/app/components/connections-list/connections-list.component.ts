import { Component, OnInit } from '@angular/core';

import { Connection, ConnectionItem } from 'src/app/models/connection';
import { ConnectionsService } from 'src/app/services/connections.service';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from 'src/app/services/user.service';
import { CompanyService } from 'src/app/services/company.service';

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
  public companyName: string;

  constructor(
    private _connectionsServise: ConnectionsService,
    public deleteDialog: MatDialog,
    private _userService: UserService,
    private _companyService: CompanyService
  ) { }

  ngOnInit(): void {
    this._userService.cast.subscribe(user => {
      user.id && this._companyService.fetchCompanyName(user.company.id)
      .subscribe((res: any) => {
        this.companyName = res.name;
      })
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
  }

  getTitle(connection: Connection) {
    if (!connection.title && connection.masterEncryption) return 'Untitled encrypted connection'
    return connection.title || connection.database
  }

  showMore() {
    this.displayedCardCount = this.connections.length;
  }

  showLess() {
    this.displayedCardCount = 3;
  }
}
