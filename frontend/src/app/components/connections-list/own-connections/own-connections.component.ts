import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { User } from '@sentry/angular';
import posthog from 'posthog-js';
import { supportedDatabasesTitles, supportedOrderedDatabases } from 'src/app/consts/databases';
import { ConnectionItem } from 'src/app/models/connection';
import { UiSettings } from 'src/app/models/ui-settings';
import { CompanyService } from 'src/app/services/company.service';
import { UiSettingsService } from 'src/app/services/ui-settings.service';

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

	public displayedCardCount: number = 3;
	public connectionsListCollapsed: boolean;
	public supportedDatabasesTitles = supportedDatabasesTitles;
	public supportedOrderedDatabases = supportedOrderedDatabases;
	public hasMultipleMembers: boolean = false;

	constructor(
		private _uiSettings: UiSettingsService,
		private _companyService: CompanyService
	) {}

	ngOnInit() {
		this._uiSettings.getUiSettings().subscribe((settings: UiSettings) => {
			this.connectionsListCollapsed = settings?.globalSettings?.connectionsListCollapsed;
			this.displayedCardCount = this.connectionsListCollapsed ? 3 : this.connections.length;
		});
	}

	ngOnChanges(changes: SimpleChanges) {
		if (changes['companyId'] && this.companyId) {
			this._companyService.fetchCompanyMembers(this.companyId).subscribe((members: any[]) => {
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
}
