import { AfterViewInit, Component, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UiSettingsService } from '../../../services/ui-settings.service';

@Component({
	selector: 'app-dashboards-sidebar',
	templateUrl: './dashboards-sidebar.component.html',
	styleUrls: ['./dashboards-sidebar.component.css'],
	imports: [
		CommonModule,
		RouterModule,
		MatListModule,
		MatIconModule,
		MatButtonModule,
		MatTooltipModule,
	],
})
export class DashboardsSidebarComponent implements OnInit, AfterViewInit {
	connectionId = input.required<string>();
	activeTab = input<'dashboards' | 'queries'>('dashboards');

	collapsed = signal(false);
	initialized = signal(false);

	private _uiSettings = inject(UiSettingsService);

	ngOnInit(): void {
		this._loadCollapsedState();
	}

	ngAfterViewInit(): void {
		// Enable transitions after initial render to prevent animation on page load
		setTimeout(() => this.initialized.set(true), 0);
	}

	toggleCollapsed(): void {
		this.collapsed.update((v) => {
			const newValue = !v;
			this._uiSettings.updateConnectionSetting(this.connectionId(), 'dashboardsSidebarCollapsed', newValue);
			return newValue;
		});
	}

	private _loadCollapsedState(): void {
		this._uiSettings.getUiSettings().subscribe((settings) => {
			this.collapsed.set(settings?.connections?.[this.connectionId()]?.dashboardsSidebarCollapsed ?? false);
		});
	}
}
