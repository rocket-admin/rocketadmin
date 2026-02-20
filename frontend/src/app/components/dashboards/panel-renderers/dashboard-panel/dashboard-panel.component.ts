import { CommonModule } from '@angular/common';
import { Component, effect, Input, inject, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DashboardWidget } from 'src/app/models/dashboard';
import { SavedQuery } from 'src/app/models/saved-query';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';
import { ChartPanelComponent } from '../chart-panel/chart-panel.component';
import { CounterPanelComponent } from '../counter-panel/counter-panel.component';
import { TablePanelComponent } from '../table-panel/table-panel.component';
import { TextPanelComponent } from '../text-panel/text-panel.component';

@Component({
	selector: 'app-dashboard-panel',
	templateUrl: './dashboard-panel.component.html',
	styleUrls: ['./dashboard-panel.component.css'],
	imports: [
		CommonModule,
		MatProgressSpinnerModule,
		ChartPanelComponent,
		CounterPanelComponent,
		TablePanelComponent,
		TextPanelComponent,
	],
})
export class DashboardPanelComponent {
	@Input({ required: true }) widget!: DashboardWidget;
	@Input({ required: true }) connectionId!: string;

	private _savedQueries = inject(SavedQueriesService);

	protected loading = signal(true);
	protected error = signal<string | null>(null);
	protected queryData = signal<Record<string, unknown>[]>([]);

	// Public signal for parent to access widget name
	public savedQuery = signal<SavedQuery | null>(null);

	constructor() {
		effect(() => {
			if (this.widget?.query_id) {
				this._loadData();
			} else {
				this.loading.set(false);
				this.error.set('No query linked to this panel');
			}
		});
	}

	private async _loadData(): Promise<void> {
		if (!this.widget.query_id) {
			this.loading.set(false);
			this.error.set('No query linked to this panel');
			return;
		}

		this.loading.set(true);
		this.error.set(null);

		try {
			const [query, result] = await Promise.all([
				this._savedQueries.fetchSavedQuery(this.connectionId, this.widget.query_id),
				this._savedQueries.executeSavedQuery(this.connectionId, this.widget.query_id),
			]);

			this.savedQuery.set(query);
			if (result) {
				this.queryData.set(result.data);
			}
			this.loading.set(false);
		} catch (err: unknown) {
			const error = err as { error?: { message?: string } };
			this.error.set(error?.error?.message || 'Failed to load data');
			this.loading.set(false);
		}
	}
}
