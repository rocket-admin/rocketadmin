import { CommonModule } from '@angular/common';
import { Component, computed, effect, Input, inject, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChartConfiguration, ChartData, ChartType as ChartJsType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { DashboardWidget } from 'src/app/models/dashboard';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';

@Component({
	selector: 'app-chart-widget',
	templateUrl: './chart-widget.component.html',
	styleUrls: ['./chart-widget.component.css'],
	imports: [CommonModule, BaseChartDirective, MatProgressSpinnerModule],
})
export class ChartWidgetComponent {
	@Input({ required: true }) widget!: DashboardWidget;
	@Input({ required: true }) connectionId!: string;

	private _savedQueries = inject(SavedQueriesService);

	protected loading = signal(false);
	protected error = signal<string | null>(null);
	protected data = signal<Record<string, unknown>[]>([]);

	protected chartData = computed<ChartData<ChartJsType> | null>(() => {
		const data = this.data();
		if (!data.length) return null;

		const labelColumn = (this.widget.widget_options?.['label_column'] as string) || this._getFirstColumn(data);
		const valueColumn = (this.widget.widget_options?.['value_column'] as string) || this._getSecondColumn(data);

		if (!labelColumn || !valueColumn) return null;

		const labels = data.map((row) => String(row[labelColumn] ?? ''));
		const values = data.map((row) => {
			const val = row[valueColumn];
			return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
		});

		const isPieType = ['pie', 'doughnut', 'polarArea'].includes(this.widget.chart_type || 'bar');

		if (isPieType) {
			return {
				labels,
				datasets: [
					{
						data: values,
						backgroundColor: this.colorPalette.slice(0, values.length),
						borderColor: this.colorPalette.slice(0, values.length).map((c) => c.replace('0.8', '1')),
						borderWidth: 1,
					},
				],
			};
		} else {
			return {
				labels,
				datasets: [
					{
						label: valueColumn,
						data: values,
						backgroundColor: this.colorPalette[0],
						borderColor: this.colorPalette[0].replace('0.8', '1'),
						borderWidth: 1,
						fill: this.widget.chart_type === 'line',
					},
				],
			};
		}
	});

	protected chartOptions: ChartConfiguration['options'] = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: true,
				position: 'top',
			},
		},
	};

	private colorPalette = [
		'rgba(99, 102, 241, 0.8)',
		'rgba(168, 85, 247, 0.8)',
		'rgba(236, 72, 153, 0.8)',
		'rgba(244, 63, 94, 0.8)',
		'rgba(251, 146, 60, 0.8)',
		'rgba(234, 179, 8, 0.8)',
		'rgba(34, 197, 94, 0.8)',
		'rgba(6, 182, 212, 0.8)',
		'rgba(59, 130, 246, 0.8)',
		'rgba(139, 92, 246, 0.8)',
	];

	constructor() {
		effect(() => {
			// This effect runs when widget input changes
			if (this.widget?.query_id) {
				this._loadData();
			}
		});
	}

	get mappedChartType(): ChartJsType {
		return (this.widget.chart_type || 'bar') as ChartJsType;
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

	private _getFirstColumn(data: Record<string, unknown>[]): string | null {
		if (!data.length) return null;
		const keys = Object.keys(data[0]);
		return keys[0] || null;
	}

	private _getSecondColumn(data: Record<string, unknown>[]): string | null {
		if (!data.length) return null;
		const keys = Object.keys(data[0]);
		return keys[1] || keys[0] || null;
	}
}
