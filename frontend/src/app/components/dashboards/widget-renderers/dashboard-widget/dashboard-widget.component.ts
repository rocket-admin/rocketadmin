import { CommonModule } from '@angular/common';
import { Component, effect, Input, inject, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
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

	private _loadData(): void {
		if (!this.widget.query_id) {
			this.loading.set(false);
			this.error.set('No query linked to this widget');
			return;
		}

		this.loading.set(true);
		this.error.set(null);

		forkJoin({
			query: this._savedQueries.fetchSavedQuery(this.connectionId, this.widget.query_id),
			result: this._savedQueries.executeSavedQuery(this.connectionId, this.widget.query_id),
		}).subscribe({
			next: ({ query, result }) => {
				this.savedQuery.set(query);
				this.queryData.set(result.data);
				this.loading.set(false);
			},
			error: (err) => {
				this.error.set(err?.error?.message || 'Failed to load data');
				this.loading.set(false);
			},
		});
	}
}
