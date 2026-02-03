import { CommonModule } from '@angular/common';
import { Component, computed, Input, OnInit, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChartConfiguration, ChartData, ChartType as ChartJsType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { DashboardWidget } from 'src/app/models/dashboard';
import { SavedQuery } from 'src/app/models/saved-query';

@Component({
	selector: 'app-chart-widget',
	templateUrl: './chart-widget.component.html',
	styleUrls: ['./chart-widget.component.css'],
	imports: [CommonModule, BaseChartDirective, MatProgressSpinnerModule],
})
export class ChartWidgetComponent implements OnInit {
	@Input({ required: true }) widget!: DashboardWidget;
	@Input({ required: true }) connectionId!: string;
	@Input() preloadedQuery: SavedQuery | null = null;
	@Input() preloadedData: Record<string, unknown>[] = [];

	protected data = signal<Record<string, unknown>[]>([]);
	protected savedQuery = signal<SavedQuery | null>(null);

	protected chartData = computed<ChartData<ChartJsType> | null>(() => {
		const data = this.data();
		const query = this.savedQuery();
		if (!data.length || !query) return null;

		const labelColumn = this._getLabelColumn(query, data);
		const valueColumn = this._getValueColumn(query, data);
		const labelType = (query.widget_options?.['label_type'] as 'values' | 'datetime') || 'values';

		if (!labelColumn || !valueColumn) return null;

		const labels = data.map((row) => {
			const val = row[labelColumn];
			if (labelType === 'datetime' && val) {
				return this._formatDatetime(val);
			}
			return String(val ?? '');
		});
		const values = data.map((row) => {
			const val = row[valueColumn];
			return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
		});

		const chartType = query.chart_type || 'bar';
		const isPieType = ['pie', 'doughnut', 'polarArea'].includes(chartType);

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
						fill: chartType === 'line',
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

	ngOnInit(): void {
		if (this.preloadedQuery) {
			this.savedQuery.set(this.preloadedQuery);
		}
		if (this.preloadedData.length > 0) {
			this.data.set(this.preloadedData);
		}
	}

	get mappedChartType(): ChartJsType {
		return (this.savedQuery()?.chart_type || 'bar') as ChartJsType;
	}

	private _getLabelColumn(query: SavedQuery, data: Record<string, unknown>[]): string | null {
		const labelCol = query.widget_options?.['label_column'] as string | undefined;
		if (labelCol) return labelCol;

		if (!data.length) return null;
		return Object.keys(data[0])[0] || null;
	}

	private _getValueColumn(query: SavedQuery, data: Record<string, unknown>[]): string | null {
		const valueCol = query.widget_options?.['value_column'] as string | undefined;
		if (valueCol) return valueCol;

		if (!data.length) return null;
		const keys = Object.keys(data[0]);
		return keys[1] || keys[0] || null;
	}

	private _formatDatetime(value: unknown): string {
		if (!value) return '';

		try {
			const date = new Date(value as string | number | Date);
			if (isNaN(date.getTime())) {
				return String(value);
			}
			return date.toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
			});
		} catch {
			return String(value);
		}
	}
}
