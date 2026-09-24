import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import posthog from 'posthog-js';
import { supportedDatabasesTitles, supportedOrderedDatabases } from 'src/app/consts/databases';
import { CompanyMember } from 'src/app/models/company';
import { ConnectionItem, DBtype } from 'src/app/models/connection';
import { UiSettings } from 'src/app/models/ui-settings';
import { User } from 'src/app/models/user';
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
	@Input() companyId: string;

	public displayedCardCount: number = 3;
	public connectionsListCollapsed: boolean;
	public supportedDatabasesTitles = supportedDatabasesTitles;
	public supportedOrderedDatabases = supportedOrderedDatabases;
	public hasMultipleMembers: boolean = false;
	public isDarkMode: boolean = false;

	constructor(
		private _uiSettings: UiSettingsService,
		private _companyService: CompanyService,
	) {}

	ngOnInit() {
		this.isDarkMode = this._uiSettings.isDarkMode;

		this._uiSettings.getUiSettings().subscribe((settings: UiSettings) => {
			this.connectionsListCollapsed = settings?.globalSettings?.connectionsListCollapsed;
			this.displayedCardCount = this.connectionsListCollapsed ? 3 : this.connections?.length || 3;
		});
	}

	ngOnChanges(changes: SimpleChanges) {
		if (changes.companyId && this.companyId) {
			this._companyService.fetchCompanyMembers(this.companyId).subscribe((members: CompanyMember[]) => {
				this.hasMultipleMembers = members && members.length > 1;
			});
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

	supportsSchemaEditing(type: DBtype | string): boolean {
		return (
			type === DBtype.Postgres ||
			type === DBtype.MySQL ||
			type === DBtype.Oracle ||
			type === DBtype.MSSQL ||
			type === DBtype.ClickHouse
		);
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
