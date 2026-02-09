import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ChartConfiguration, ChartData, ChartType as ChartJsType } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { BaseChartDirective } from 'ng2-charts';
import { ChartType } from 'src/app/models/saved-query';

@Component({
	selector: 'app-chart-preview',
	templateUrl: './chart-preview.component.html',
	styleUrls: ['./chart-preview.component.css'],
	imports: [CommonModule, BaseChartDirective],
})
export class ChartPreviewComponent implements OnChanges {
	@Input() chartType: ChartType = 'bar';
	@Input() data: Record<string, unknown>[] = [];
	@Input() labelColumn = '';
	@Input() valueColumn = '';
	@Input() labelType: 'values' | 'datetime' = 'values';

	public chartData: ChartData<ChartJsType> | null = null;
	public chartOptions: ChartConfiguration['options'] = this._getDefaultOptions();

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

	ngOnChanges(changes: SimpleChanges): void {
		if (
			changes['data'] ||
			changes['labelColumn'] ||
			changes['valueColumn'] ||
			changes['chartType'] ||
			changes['labelType']
		) {
			this.updateChartData();
		}
	}

	get mappedChartType(): ChartJsType {
		return this.chartType as ChartJsType;
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

	private _getTimeScaleOptions(): ChartConfiguration['options'] {
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
						text: this.labelColumn,
					},
				},
				y: {
					beginAtZero: true,
					title: {
						display: true,
						text: this.valueColumn,
					},
				},
			},
		};
	}

	private updateChartData(): void {
		if (!this.data.length || !this.labelColumn || !this.valueColumn) {
			this.chartData = null;
			return;
		}

		const isPieType = ['pie', 'doughnut', 'polarArea'].includes(this.chartType);
		const useTimeScale = this.labelType === 'datetime' && !isPieType;

		// Update options based on whether we're using time scale
		this.chartOptions = useTimeScale ? this._getTimeScaleOptions() : this._getDefaultOptions();

		if (useTimeScale) {
			// For time scale, use {x, y} data points
			const dataPoints = this.data
				.map((row) => {
					const dateVal = row[this.labelColumn];
					const numVal = row[this.valueColumn];
					const date = this._parseDate(dateVal);
					if (!date) return null;
					return {
						x: date.getTime(),
						y: typeof numVal === 'number' ? numVal : parseFloat(String(numVal)) || 0,
					};
				})
				.filter((point): point is { x: number; y: number } => point !== null)
				.sort((a, b) => a.x - b.x);

			this.chartData = {
				datasets: [
					{
						label: this.valueColumn,
						data: dataPoints,
						backgroundColor: this.colorPalette[0],
						borderColor: this.colorPalette[0].replace('0.8', '1'),
						borderWidth: 1,
						fill: this.chartType === 'line',
						spanGaps: false,
					},
				],
			};
		} else {
			// For categorical scale, use labels + values
			const labels = this.data.map((row) => String(row[this.labelColumn] ?? ''));
			const values = this.data.map((row) => {
				const val = row[this.valueColumn];
				return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
			});

			if (isPieType) {
				this.chartData = {
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
				this.chartData = {
					labels,
					datasets: [
						{
							label: this.valueColumn,
							data: values,
							backgroundColor: this.colorPalette[0],
							borderColor: this.colorPalette[0].replace('0.8', '1'),
							borderWidth: 1,
							fill: this.chartType === 'line',
						},
					],
				};
			}
		}
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
}
