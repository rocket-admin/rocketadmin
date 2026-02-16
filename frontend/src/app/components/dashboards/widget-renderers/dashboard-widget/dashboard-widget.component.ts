import { CommonModule } from '@angular/common';
import { Component, effect, Input, inject, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DashboardWidget } from 'src/app/models/dashboard';
import { SavedQuery } from 'src/app/models/saved-query';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';
import { ChartWidgetComponent } from '../chart-widget/chart-widget.component';
import { CounterWidgetComponent } from '../counter-widget/counter-widget.component';
import { TableWidgetComponent } from '../table-widget/table-widget.component';
import { TextWidgetComponent } from '../text-widget/text-widget.component';

@Component({
	selector: 'app-dashboard-widget',
	templateUrl: './dashboard-widget.component.html',
	styleUrls: ['./dashboard-widget.component.css'],
	imports: [
		CommonModule,
		MatProgressSpinnerModule,
		ChartWidgetComponent,
		CounterWidgetComponent,
		TableWidgetComponent,
		TextWidgetComponent,
	],
})
export class DashboardWidgetComponent {
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
				this.error.set('No query linked to this widget');
			}
		});
	}

	private async _loadData(): Promise<void> {
		if (!this.widget.query_id) {
			this.loading.set(false);
			this.error.set('No query linked to this widget');
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
