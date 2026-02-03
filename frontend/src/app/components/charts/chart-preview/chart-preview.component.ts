import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ChartConfiguration, ChartData, ChartType as ChartJsType } from 'chart.js';
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

	public chartData: ChartData<ChartJsType> | null = null;
	public chartOptions: ChartConfiguration['options'] = {
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

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['data'] || changes['labelColumn'] || changes['valueColumn'] || changes['chartType']) {
			this.updateChartData();
		}
	}

	get mappedChartType(): ChartJsType {
		return this.chartType as ChartJsType;
	}

	private updateChartData(): void {
		if (!this.data.length || !this.labelColumn || !this.valueColumn) {
			this.chartData = null;
			return;
		}

		const labels = this.data.map((row) => String(row[this.labelColumn] ?? ''));
		const values = this.data.map((row) => {
			const val = row[this.valueColumn];
			return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
		});

		const isPieType = ['pie', 'doughnut', 'polarArea'].includes(this.chartType);

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
