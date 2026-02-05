import { CommonModule } from '@angular/common';
import { Component, computed, Input, OnInit, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChartConfiguration, ChartData, ChartType as ChartJsType } from 'chart.js';
import 'chartjs-adapter-date-fns';
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

		const chartType = query.chart_type || 'bar';
		const isPieType = ['pie', 'doughnut', 'polarArea'].includes(chartType);
		const useTimeScale = labelType === 'datetime' && !isPieType;

		if (useTimeScale) {
			// For time scale, use {x, y} data points
			const dataPoints = data
				.map((row) => {
					const dateVal = row[labelColumn];
					const numVal = row[valueColumn];
					const date = this._parseDate(dateVal);
					if (!date) return null;
					return {
						x: date.getTime(),
						y: typeof numVal === 'number' ? numVal : parseFloat(String(numVal)) || 0,
					};
				})
				.filter((point): point is { x: number; y: number } => point !== null)
				.sort((a, b) => a.x - b.x);

			return {
				datasets: [
					{
						label: valueColumn,
						data: dataPoints,
						backgroundColor: this.colorPalette[0],
						borderColor: this.colorPalette[0].replace('0.8', '1'),
						borderWidth: 1,
						fill: chartType === 'line',
						spanGaps: false,
					},
				],
			};
		} else {
			// For categorical scale, use labels + values
			const labels = data.map((row) => String(row[labelColumn] ?? ''));
			const values = data.map((row) => {
				const val = row[valueColumn];
				return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
			});

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
		}
	});

	protected chartOptions = computed<ChartConfiguration['options']>(() => {
		const query = this.savedQuery();
		const data = this.data();
		if (!query || !data.length) return this._getDefaultOptions();

		const labelColumn = this._getLabelColumn(query, data);
		const valueColumn = this._getValueColumn(query, data);
		const labelType = (query.widget_options?.['label_type'] as 'values' | 'datetime') || 'values';
		const chartType = query.chart_type || 'bar';
		const isPieType = ['pie', 'doughnut', 'polarArea'].includes(chartType);
		const useTimeScale = labelType === 'datetime' && !isPieType;

		if (useTimeScale) {
			return this._getTimeScaleOptions(labelColumn || '', valueColumn || '');
		}
		return this._getDefaultOptions();
	});

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

	private _parseDate(value: unknown): Date | null {
		if (!value) return null;

		try {
			const date = new Date(value as string | number | Date);
			if (isNaN(date.getTime())) {
				return null;
			}
			return date;
		} catch {
			return null;
		}
	}

	private _getDefaultOptions(): ChartConfiguration['options'] {
		return {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					display: true,
					position: 'top',
				},
			},
		};
	}

	private _getTimeScaleOptions(labelColumn: string, valueColumn: string): ChartConfiguration['options'] {
		return {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					display: true,
					position: 'top',
				},
			},
			scales: {
				x: {
					type: 'time',
					time: {
						tooltipFormat: 'MMM d, yyyy',
						displayFormats: {
							day: 'MMM d',
							week: 'MMM d',
							month: 'MMM yyyy',
							year: 'yyyy',
						},
					},
					title: {
						display: true,
						text: labelColumn,
					},
				},
				y: {
					beginAtZero: true,
					title: {
						display: true,
						text: valueColumn,
					},
				},
			},
		};
	}
}
