import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ChartConfiguration, ChartData, ChartType as ChartJsType, Plugin } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { BaseChartDirective } from 'ng2-charts';
import {
	buildChartData,
	buildChartOptions,
	buildDataLabelsPlugin,
	getMappedChartType,
} from 'src/app/lib/chart-config.helper';
import { ChartType, ChartWidgetOptions } from 'src/app/models/saved-query';

@Component({
	selector: 'app-chart-preview',
	templateUrl: './chart-preview.component.html',
	styleUrls: ['./chart-preview.component.css'],
	imports: [CommonModule, BaseChartDirective],
})
export class ChartPreviewComponent implements OnChanges {
	@Input() chartType: ChartType = 'bar';
	@Input() data: Record<string, unknown>[] = [];
	@Input() widgetOptions: ChartWidgetOptions | null = null;

	// Legacy inputs for backward compatibility
	@Input() labelColumn = '';
	@Input() valueColumn = '';
	@Input() labelType: 'values' | 'datetime' = 'values';

	public chartData: ChartData<ChartJsType> | null = null;
	public chartOptions: ChartConfiguration['options'] = this._getDefaultOptions();
	public chartPlugins: Plugin[] = [];

	ngOnChanges(changes: SimpleChanges): void {
		if (
			changes['data'] ||
			changes['widgetOptions'] ||
			changes['labelColumn'] ||
			changes['valueColumn'] ||
			changes['chartType'] ||
			changes['labelType']
		) {
			this._updateChart();
		}
	}

	get mappedChartType(): ChartJsType {
		const options = this._resolveOptions();
		return getMappedChartType(this.chartType, options);
	}

	private _updateChart(): void {
		const options = this._resolveOptions();

		if (!this.data.length || !options.label_column) {
			this.chartData = null;
			return;
		}

		// Check that at least one value source exists
		const hasValues = options.series?.length || options.value_column;
		if (!hasValues) {
			this.chartData = null;
			return;
		}

		this.chartData = buildChartData(this.data, this.chartType, options);
		this.chartOptions = buildChartOptions(this.chartType, options);

		const plugin = buildDataLabelsPlugin(options);
		this.chartPlugins = plugin ? [plugin] : [];
	}

	private _resolveOptions(): ChartWidgetOptions {
		if (this.widgetOptions) {
			return this.widgetOptions;
		}

		// Legacy mode: build options from individual inputs
		return {
			label_column: this.labelColumn,
			value_column: this.valueColumn,
			label_type: this.labelType,
		};
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
}
