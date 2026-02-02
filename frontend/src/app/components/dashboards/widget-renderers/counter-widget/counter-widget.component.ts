import { CommonModule } from '@angular/common';
import { Component, computed, effect, Input, inject, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DashboardWidget } from 'src/app/models/dashboard';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';

@Component({
	selector: 'app-counter-widget',
	templateUrl: './counter-widget.component.html',
	styleUrls: ['./counter-widget.component.css'],
	imports: [CommonModule, MatProgressSpinnerModule],
})
export class CounterWidgetComponent {
	@Input({ required: true }) widget!: DashboardWidget;
	@Input({ required: true }) connectionId!: string;

	private _savedQueries = inject(SavedQueriesService);

	protected loading = signal(false);
	protected error = signal<string | null>(null);
	protected data = signal<Record<string, unknown>[]>([]);

	protected counterValue = computed(() => {
		const data = this.data();
		if (!data.length) return null;

		// Get the value column from widget options or use the first column
		const valueColumn = (this.widget.widget_options?.['value_column'] as string) || Object.keys(data[0])[0];
		if (!valueColumn) return null;

		const value = data[0][valueColumn];
		if (typeof value === 'number') {
			return this._formatNumber(value);
		}
		return String(value);
	});

	protected label = computed(() => {
		const data = this.data();
		if (!data.length) return '';

		const labelColumn = this.widget.widget_options?.['label_column'] as string;
		if (labelColumn && data[0][labelColumn]) {
			return String(data[0][labelColumn]);
		}

		const valueColumn = (this.widget.widget_options?.['value_column'] as string) || Object.keys(data[0])[0];
		return valueColumn || '';
	});

	constructor() {
		effect(() => {
			if (this.widget?.query_id) {
				this._loadData();
			}
		});
	}

	private _loadData(): void {
		if (!this.widget.query_id) {
			this.error.set('No query linked to this widget');
			return;
		}

		this.loading.set(true);
		this.error.set(null);

		this._savedQueries.executeSavedQuery(this.connectionId, this.widget.query_id).subscribe({
			next: (result) => {
				this.data.set(result.data);
				this.loading.set(false);
			},
			error: (err) => {
				this.error.set(err?.error?.message || 'Failed to load data');
				this.loading.set(false);
			},
		});
	}

	private _formatNumber(value: number): string {
		if (Math.abs(value) >= 1000000) {
			return (value / 1000000).toFixed(1) + 'M';
		} else if (Math.abs(value) >= 1000) {
			return (value / 1000).toFixed(1) + 'K';
		}
		return value.toLocaleString();
	}
}
