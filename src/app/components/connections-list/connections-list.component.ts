import { Component, OnInit } from '@angular/core';

import { Connection, ConnectionItem } from 'src/app/models/connection';
import { ConnectionsService } from 'src/app/services/connections.service';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-connections-list',
  templateUrl: './connections-list.component.html',
  styleUrls: ['./connections-list.component.css']
})
export class ConnectionsListComponent implements OnInit {

  public connections: ConnectionItem[] = null;
  public testConnections: ConnectionItem[] = null;
  public titles: Object;

  constructor(
    private _connectionsServise: ConnectionsService,
    public deleteDialog: MatDialog,
    private _userService: UserService,
  ) { }

  ngOnInit(): void {
    this._userService.cast.subscribe(user => {
      user.id && this._connectionsServise.fetchConnections()
      .subscribe((res: any) => {
        this.setConnections(res);
      })
    });
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
}
