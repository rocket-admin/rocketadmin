import { CommonModule } from '@angular/common';
import { Component, computed, Input, OnInit, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DashboardWidget } from 'src/app/models/dashboard';
import { SavedQuery } from 'src/app/models/saved-query';

@Component({
	selector: 'app-counter-panel',
	templateUrl: './counter-panel.component.html',
	styleUrls: ['./counter-panel.component.css'],
	imports: [CommonModule, MatProgressSpinnerModule],
})
export class CounterPanelComponent implements OnInit {
	@Input({ required: true }) widget!: DashboardWidget;
	@Input({ required: true }) connectionId!: string;
	@Input() preloadedQuery: SavedQuery | null = null;
	@Input() preloadedData: Record<string, unknown>[] = [];

	protected data = signal<Record<string, unknown>[]>([]);
	protected savedQuery = signal<SavedQuery | null>(null);

	protected counterValue = computed(() => {
		const data = this.data();
		const query = this.savedQuery();
		if (!data.length || !query) return null;

		const valueColumn = this._getValueColumn(query, data);
		if (!valueColumn) return null;

		const value = data[0][valueColumn];
		if (typeof value === 'number') {
			return this._formatNumber(value);
		}
		return String(value);
	});

	protected label = computed(() => {
		const data = this.data();
		const query = this.savedQuery();
		if (!data.length || !query) return '';

		const labelColumn = query.widget_options?.['label_column'] as string | undefined;
		if (labelColumn && data[0][labelColumn]) {
			return String(data[0][labelColumn]);
		}

		const valueColumn = this._getValueColumn(query, data);
		return valueColumn || '';
	});

	ngOnInit(): void {
		if (this.preloadedQuery) {
			this.savedQuery.set(this.preloadedQuery);
		}
		if (this.preloadedData.length > 0) {
			this.data.set(this.preloadedData);
		}
	}

	private _getValueColumn(query: SavedQuery, data: Record<string, unknown>[]): string | null {
		const valueCol = query.widget_options?.['value_column'] as string | undefined;
		if (valueCol) return valueCol;

		if (!data.length) return null;
		return Object.keys(data[0])[0] || null;
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
