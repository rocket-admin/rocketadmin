import { AfterViewInit, Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

const SIDEBAR_COLLAPSED_KEY = 'dashboards_sidebar_collapsed';

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
export class DashboardsSidebarComponent implements AfterViewInit {
	connectionId = input.required<string>();
	activeTab = input<'dashboards' | 'queries'>('dashboards');

	collapsed = signal(this._loadCollapsedState());
	initialized = signal(false);

	ngAfterViewInit(): void {
		// Enable transitions after initial render to prevent animation on page load
		setTimeout(() => this.initialized.set(true), 0);
	}

	toggleCollapsed(): void {
		this.collapsed.update((v) => {
			const newValue = !v;
			this._saveCollapsedState(newValue);
			return newValue;
		});
	}

	private _loadCollapsedState(): boolean {
		const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
		return saved === 'true';
	}

	private _saveCollapsedState(collapsed: boolean): void {
		localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
	}
}
