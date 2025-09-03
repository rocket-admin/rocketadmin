import { Component, Input } from '@angular/core';
import { supportedDatabasesTitles, supportedOrderedDatabases } from 'src/app/consts/databases';

import { CommonModule } from '@angular/common';
import { ConnectionItem } from 'src/app/models/connection';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { UiSettings } from 'src/app/models/ui-settings';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { User } from '@sentry/angular-ivy';

@Component({
  selector: 'app-own-connections',
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './own-connections.component.html',
  styleUrl: './own-connections.component.css'
})
export class OwnConnectionsComponent {
  @Input() currentUser: User;
  @Input() connections: ConnectionItem[] = null;
  @Input() isDemo: boolean = false;

  public displayedCardCount: number = 3;
  public connectionsListCollapsed: boolean;
  public supportedDatabasesTitles = supportedDatabasesTitles;
  public supportedOrderedDatabases = supportedOrderedDatabases;

  constructor(private _uiSettings: UiSettingsService) {}

  ngOnInit() {
    this._uiSettings.getUiSettings()
      .subscribe( (settings: UiSettings) => {
        this.connectionsListCollapsed = settings?.globalSettings?.connectionsListCollapsed;
        this.displayedCardCount = this.connectionsListCollapsed ? 3 : this.connections.length;
      });
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
