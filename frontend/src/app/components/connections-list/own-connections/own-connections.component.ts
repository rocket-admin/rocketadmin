import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import posthog from 'posthog-js';
import { firstValueFrom } from 'rxjs';
import { supportedDatabasesTitles, supportedOrderedDatabases } from 'src/app/consts/databases';
import { AlertActionType, AlertType } from 'src/app/models/alert';
import { CompanyMember, CompanyMemberRole } from 'src/app/models/company';
import { ConnectionItem } from 'src/app/models/connection';
import { UiSettings } from 'src/app/models/ui-settings';
import { SubscriptionPlans, User } from 'src/app/models/user';
import { CompanyService } from 'src/app/services/company.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { HostedDatabaseService } from 'src/app/services/hosted-database.service';
import { NotificationsService } from 'src/app/services/notifications.service';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { environment } from 'src/environments/environment';
import {
	HostedDatabasePlanChoice,
	HostedDatabasePlanDialogComponent,
} from '../hosted-database-plan-dialog/hosted-database-plan-dialog.component';
import {
	HostedDatabaseRenameDialogComponent,
	HostedDatabaseRenameDialogData,
} from '../hosted-database-rename-dialog/hosted-database-rename-dialog.component';
import {
	HostedDatabaseSuccessDialogComponent,
	HostedDatabaseSuccessDialogData,
} from '../hosted-database-success-dialog/hosted-database-success-dialog.component';

@Component({
	selector: 'app-own-connections',
	imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatTooltipModule],
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
	public creatingHostedDatabase = signal(false);
	public hostedDbCount: number = 0;

	constructor(
		private _uiSettings: UiSettingsService,
		private _companyService: CompanyService,
		private _connectionsService: ConnectionsService,
		private _hostedDatabaseService: HostedDatabaseService,
		private _notifications: NotificationsService,
		private _dialog: MatDialog,
		private _router: Router,
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
			this.displayedCardCount = this.connectionsListCollapsed ? 3 : this.connections?.length || 3;
		});
	}

	get hostedDbLimitReached(): boolean {
		return this.hostedDbCount >= 3;
	}

	ngOnChanges(changes: SimpleChanges) {
		if (changes.companyId && this.companyId) {
			this._companyService.fetchCompanyMembers(this.companyId).subscribe((members: CompanyMember[]) => {
				this.hasMultipleMembers = members && members.length > 1;
			});

			if (this.isSaas) {
				this._hostedDatabaseService.listHostedDatabases(this.companyId).then((dbs) => {
					this.hostedDbCount = dbs?.length || 0;
				});
			}
		}

		if (changes.connections && this.connections && !this.connectionsListCollapsed) {
			this.displayedCardCount = this.connections.length;
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

	async createHostedDatabase(): Promise<void> {
		if (!this.currentUser?.company?.id || !this.currentUser?.id || this.creatingHostedDatabase()) {
			return;
		}

		if (this.hostedDbLimitReached) {
			this._router.navigate(['/upgrade']);
			return;
		}

		const subscriptionLevel = this.currentUser.subscriptionLevel;
		const isFreePlan = !subscriptionLevel || subscriptionLevel === SubscriptionPlans.free;
		console.log('[HostedDB] subscriptionLevel:', subscriptionLevel, 'isFreePlan:', isFreePlan);

		if (isFreePlan) {
			const choice = await this._openPlanDialog();
			console.log('[HostedDB] plan dialog choice:', choice);
			if (!choice) {
				return;
			}
			if (choice === 'upgrade') {
				this._router.navigate(['/upgrade']);
				return;
			}
		}

		const companyId = this.currentUser.company.id;

		this.creatingHostedDatabase.set(true);
		posthog.capture('Connections: hosted PostgreSQL creation started');

		// Remember existing connection IDs before creation
		const existingIds = new Set(
			(this._connectionsService.ownConnectionsList || []).map((c: any) => c.connection?.id || c.id),
		);

		try {
			const hostedDatabase = await this._hostedDatabaseService.createHostedDatabase(companyId);

			if (!hostedDatabase) {
				return;
			}

			posthog.capture('Connections: hosted PostgreSQL provisioned successfully');
			this._notifications.showSuccessSnackbar('Hosted PostgreSQL database is ready.');
			this.hostedDbCount++;

			// Fetch connections and find the newly created one by diffing
			let connectionId: string | null = null;
			try {
				await new Promise<void>((resolve) => {
					this._connectionsService.fetchConnections().subscribe({
						next: () => {
							const list = this._connectionsService.ownConnectionsList || [];
							const newConn = list.find((c: any) => {
								const id = c.connection?.id || c.id;
								return !existingIds.has(id);
							});
							connectionId = (newConn as any)?.connection?.id || newConn?.id || null;
							resolve();
						},
						error: () => resolve(),
					});
				});
			} catch {}

			this._openHostedDatabaseDialog({
				hostedDatabase,
				connectionId,
			});
		} catch (error) {
			const errorMessage = this._getErrorMessage(error);
			posthog.capture('Connections: hosted PostgreSQL provisioning failed', { errorMessage });
			this._notifications.showAlert(AlertType.Error, errorMessage, [
				{
					type: AlertActionType.Button,
					caption: 'Dismiss',
					action: (_id: number) => this._notifications.dismissAlert(),
				},
			]);
		} finally {
			this.creatingHostedDatabase.set(false);
		}
	}

	private _openPlanDialog(): Promise<HostedDatabasePlanChoice | undefined> {
		const dialogRef = this._dialog.open<HostedDatabasePlanDialogComponent, void, HostedDatabasePlanChoice>(
			HostedDatabasePlanDialogComponent,
			{
				width: '32em',
				maxWidth: '95vw',
			},
		);
		return firstValueFrom(dialogRef.afterClosed());
	}

	private _openHostedDatabaseDialog(data: HostedDatabaseSuccessDialogData): void {
		const dialogRef = this._dialog.open(HostedDatabaseSuccessDialogComponent, {
			width: '42em',
			maxWidth: '95vw',
			data,
			disableClose: true,
		});

		dialogRef.afterClosed().subscribe(() => {
			if (data.connectionId) {
				this._openRenameDialog({
					connectionId: data.connectionId,
					hostedDatabase: data.hostedDatabase,
				});
			}
		});
	}

	private _openRenameDialog(data: HostedDatabaseRenameDialogData): void {
		this._dialog.open(HostedDatabaseRenameDialogComponent, {
			width: '28em',
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
