import { Component, OnInit } from '@angular/core';
import { Connection, ConnectionItem } from 'src/app/models/connection';

import { AlertComponent } from '../ui-components/alert/alert.component';
import { Angulartics2Module } from 'angulartics2';
import { CommonModule } from '@angular/common';
import { CompanyService } from 'src/app/services/company.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { PlaceholderConnectionsComponent } from '../skeletons/placeholder-connections/placeholder-connections.component';
import { RouterModule } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { User } from 'src/app/models/user';
import { UserService } from 'src/app/services/user.service';
import { take } from 'rxjs/operators';
import { OwnConnectionsComponent } from './own-connections/own-connections.component';
import { DemoConnectionsComponent } from './demo-connections/demo-connections.component';

@Component({
  selector: 'app-connections-list',
  templateUrl: './connections-list.component.html',
  styleUrls: ['./connections-list.component.css'],
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    AlertComponent,
    PlaceholderConnectionsComponent,
    Angulartics2Module,
    OwnConnectionsComponent,
    DemoConnectionsComponent
  ]
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
    private title: Title
  ) { }

  get isDemo() {
    return this._userService.isDemo;
  }

  ngOnInit(): void {
    this._companyService.getCurrentTabTitle()
      .pipe(take(1))
      .subscribe(tabTitle => {
        this.title.setTitle(`Connections | ${tabTitle || 'Rocketadmin'}`);
      });

    this._userService.cast.subscribe(user => {
      this.currentUser = user;
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
}
