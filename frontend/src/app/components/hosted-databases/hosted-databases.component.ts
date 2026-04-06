import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Title } from '@angular/platform-browser';
import posthog from 'posthog-js';
import { FoundHostedDatabase } from 'src/app/models/hosted-database';
import { CompanyService } from 'src/app/services/company.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { HostedDatabaseService } from 'src/app/services/hosted-database.service';

import { UserService } from 'src/app/services/user.service';
import { ProfileSidebarComponent } from '../profile/profile-sidebar/profile-sidebar.component';
import { AlertComponent } from '../ui-components/alert/alert.component';
import { HostedDatabaseDeleteDialogComponent } from './hosted-database-delete-dialog/hosted-database-delete-dialog.component';
import { HostedDatabasesRenameDialogComponent } from './hosted-database-rename-dialog/hosted-database-rename-dialog.component';
import { HostedDatabaseResetPasswordDialogComponent } from './hosted-database-reset-password-dialog/hosted-database-reset-password-dialog.component';

@Component({
	selector: 'app-hosted-databases',
	templateUrl: './hosted-databases.component.html',
	styleUrls: ['./hosted-databases.component.css'],
	imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, AlertComponent, ProfileSidebarComponent],
})
export class HostedDatabasesComponent implements OnInit {
	private _hostedDatabaseService = inject(HostedDatabaseService);
	private _connectionsService = inject(ConnectionsService);
	private _userService = inject(UserService);
	private _company = inject(CompanyService);
	private _dialog = inject(MatDialog);
	private _title = inject(Title);

	protected databases = signal<FoundHostedDatabase[] | null>(null);
	protected loading = signal(true);

	private _companyId: string | null = null;

	ngOnInit(): void {
		this._company.getCurrentTabTitle().subscribe((tabTitle) => {
			this._title.setTitle(`Hosted Databases | ${tabTitle || 'Rocketadmin'}`);
		});

		this._userService.cast.subscribe((user) => {
			if (user?.company?.id && user.company.id !== this._companyId) {
				this._companyId = user.company.id;
				this._loadDatabases();
			}
		});
	}

	deleteDatabase(db: FoundHostedDatabase): void {
		const dialogRef = this._dialog.open(HostedDatabaseDeleteDialogComponent, {
			width: '25em',
			data: db,
		});

		dialogRef.afterClosed().subscribe(async (action) => {
			if (action === 'delete') {
				posthog.capture('Hosted Databases: database deleted successfully');
				this._connectionsService.invalidateConnections();
				await this._loadDatabases();
			}
		});
	}

	renameDatabase(db: FoundHostedDatabase): void {
		const dialogRef = this._dialog.open(HostedDatabasesRenameDialogComponent, {
			width: '28em',
			maxWidth: '95vw',
			data: db,
		});

		dialogRef.afterClosed().subscribe(async (newTitle) => {
			if (newTitle) {
				await this._loadDatabases();
			}
		});
	}

	resetPassword(db: FoundHostedDatabase): void {
		this._dialog.open(HostedDatabaseResetPasswordDialogComponent, {
			width: '32em',
			maxWidth: '95vw',
			data: db,
			disableClose: true,
		});
	}

	private async _loadDatabases(): Promise<void> {
		if (!this._companyId) return;

		this.loading.set(true);

		try {
			const result = await this._hostedDatabaseService.listHostedDatabases(this._companyId);
			this.databases.set(result ?? []);
		} finally {
			this.loading.set(false);
		}
	}
}
