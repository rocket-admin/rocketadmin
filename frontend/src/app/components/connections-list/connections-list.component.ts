import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { Angulartics2Module } from 'angulartics2';
import { Connection } from 'src/app/models/connection';
import { User } from 'src/app/models/user';
import { CompanyService } from 'src/app/services/company.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { UserService } from 'src/app/services/user.service';
import { PlaceholderConnectionsComponent } from '../skeletons/placeholder-connections/placeholder-connections.component';
import { AlertComponent } from '../ui-components/alert/alert.component';
import { OwnConnectionsComponent } from './own-connections/own-connections.component';

@Component({
	selector: 'app-connections-list',
	templateUrl: './connections-list.component.html',
	styleUrls: ['./connections-list.component.css'],
	imports: [
		CommonModule,
		RouterModule,
		MatIconModule,
		MatButtonModule,
		AlertComponent,
		PlaceholderConnectionsComponent,
		Angulartics2Module,
		OwnConnectionsComponent,
	],
})
export class ConnectionsListComponent implements OnInit {
	public connections: Connection[] = null;
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
		private title: Title,
	) {}

	get ownConnections() {
		return this._connectionsServise.ownConnectionsList;
	}

	ngOnInit(): void {
		this.title.setTitle('Connections | Rocketadmin');

		this._userService.cast.subscribe((user) => {
			this.currentUser = user;
			user.id &&
				this._companyService.fetchCompanyName(user.company.id).subscribe((res: any) => {
					this.companyName = res.name;
				});
		});
	}
}
