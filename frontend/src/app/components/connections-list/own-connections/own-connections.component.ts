import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import posthog from 'posthog-js';
import { catchError, EMPTY, finalize, map, switchMap, tap } from 'rxjs';
import { supportedDatabasesTitles, supportedOrderedDatabases } from 'src/app/consts/databases';
import { AlertActionType, AlertType } from 'src/app/models/alert';
import { CompanyMember, CompanyMemberRole } from 'src/app/models/company';
import { ConnectionItem } from 'src/app/models/connection';
import { CreateHostedDatabaseConnectionPayload } from 'src/app/models/hosted-database';
import { UiSettings } from 'src/app/models/ui-settings';
import { User } from 'src/app/models/user';
import { CompanyService } from 'src/app/services/company.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { HostedDatabaseService } from 'src/app/services/hosted-database.service';
import { NotificationsService } from 'src/app/services/notifications.service';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { environment } from 'src/environments/environment';
import {
	HostedDatabaseSuccessDialogComponent,
	HostedDatabaseSuccessDialogData,
} from '../hosted-database-success-dialog/hosted-database-success-dialog.component';

@Component({
	selector: 'app-own-connections',
	imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
	templateUrl: './own-connections.component.html',
	styleUrl: './own-connections.component.css',
})
export class OwnConnectionsComponent implements OnInit, OnChanges {
	protected posthog = posthog;
	@Input() currentUser: User;
	@Input() connections: ConnectionItem[] = null;
	@Input() isDemo: boolean = false;
	@Input() companyId: string;

	public isSaas: boolean = !!environment.saas;
	public displayedCardCount: number = 3;
	public connectionsListCollapsed: boolean;
	public supportedDatabasesTitles = supportedDatabasesTitles;
	public supportedOrderedDatabases = supportedOrderedDatabases;
	public hasMultipleMembers: boolean = false;
	public isDarkMode: boolean = false;
	public creatingHostedDatabase: boolean = false;

	constructor(
		private _uiSettings: UiSettingsService,
		private _companyService: CompanyService,
		private _connectionsService: ConnectionsService,
		private _hostedDatabaseService: HostedDatabaseService,
		private _notifications: NotificationsService,
		private _dialog: MatDialog,
	) {}

	get canManageConnections(): boolean {
		return this.currentUser?.role === CompanyMemberRole.CAO || this.currentUser?.role === CompanyMemberRole.SystemAdmin;
	}

	get showHostedDatabaseEntry(): boolean {
		return this.isSaas && !this.isDemo && this.canManageConnections;
	}

	ngOnInit() {
		this.isDarkMode = this._uiSettings.isDarkMode;

		this._uiSettings.getUiSettings().subscribe((settings: UiSettings) => {
			this.connectionsListCollapsed = settings?.globalSettings?.connectionsListCollapsed;
			this.displayedCardCount = this.connectionsListCollapsed ? 3 : this.connections.length;
		});
	}

	ngOnChanges(changes: SimpleChanges) {
		if (changes.companyId && this.companyId) {
			this._companyService.fetchCompanyMembers(this.companyId).subscribe((members: CompanyMember[]) => {
				this.hasMultipleMembers = members && members.length > 1;
			});
		}
	}

	showMore() {
		this.displayedCardCount = this.connections.length;
		this._uiSettings.updateGlobalSetting('connectionsListCollapsed', false);
	}

	showLess() {
		this.displayedCardCount = 3;
		this._uiSettings.updateGlobalSetting('connectionsListCollapsed', true);
	}

	getMainTitle(database: string): string {
		const title = this.supportedDatabasesTitles[database] || database;
		const match = title.match(/^([^(]+)/);
		return match ? match[1].trim() : title;
	}

	getSubTitle(database: string): string {
		const title = this.supportedDatabasesTitles[database] || database;
		const match = title.match(/(\([^)]+\))/);
		return match ? match[1] : '';
	}

	createHostedDatabase(): void {
		if (!this.currentUser?.company?.id || !this.currentUser?.id || this.creatingHostedDatabase) {
			return;
		}

		const companyId = this.currentUser.company.id;
		const userId = this.currentUser.id;

		this.creatingHostedDatabase = true;
		posthog.capture('Connections: hosted PostgreSQL creation started');

		this._hostedDatabaseService
			.createHostedDatabase(companyId)
			.pipe(
				tap(() => {
					posthog.capture('Connections: hosted PostgreSQL provisioned successfully');
				}),
				switchMap((hostedDatabase) => {
					const payload: CreateHostedDatabaseConnectionPayload = {
						companyId,
						userId,
						databaseName: hostedDatabase.databaseName,
						hostname: hostedDatabase.hostname,
						port: hostedDatabase.port,
						username: hostedDatabase.username,
						password: hostedDatabase.password,
					};

					return this._hostedDatabaseService.createConnectionForHostedDatabase(payload).pipe(
						map((createdConnection) => ({
							hostedDatabase,
							connectionId: createdConnection.id,
						})),
						catchError((error) => {
							const errorMessage = this._getErrorMessage(error);
							posthog.capture('Connections: hosted PostgreSQL connection creation failed', { errorMessage });
							this._openHostedDatabaseDialog({
								hostedDatabase,
								connectionId: null,
								errorMessage,
							});
							return EMPTY;
						}),
					);
				}),
				finalize(() => {
					this.creatingHostedDatabase = false;
				}),
			)
			.subscribe({
				next: ({ hostedDatabase, connectionId }) => {
					posthog.capture('Connections: hosted PostgreSQL connection created successfully', { connectionId });
					this._connectionsService.fetchConnections().subscribe();
					this._notifications.showSuccessSnackbar('Hosted PostgreSQL database is ready.');
					this._openHostedDatabaseDialog({
						hostedDatabase,
						connectionId,
					});
				},
				error: (error) => {
					const errorMessage = this._getErrorMessage(error);
					posthog.capture('Connections: hosted PostgreSQL provisioning failed', { errorMessage });
					this._notifications.showAlert(AlertType.Error, errorMessage, [
						{
							type: AlertActionType.Button,
							caption: 'Dismiss',
							action: (_id: number) => this._notifications.dismissAlert(),
						},
					]);
				},
			});
	}

	private _openHostedDatabaseDialog(data: HostedDatabaseSuccessDialogData): void {
		this._dialog.open(HostedDatabaseSuccessDialogComponent, {
			width: '42em',
			maxWidth: '95vw',
			data,
		});
	}

	private _getErrorMessage(error: unknown): string {
		if (error instanceof Error && error.message) {
			return error.message;
		}

		return 'Unknown error';
	}
}
