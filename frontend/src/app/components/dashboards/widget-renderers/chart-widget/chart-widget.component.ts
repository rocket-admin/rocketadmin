import { CommonModule } from '@angular/common';
import { Component, computed, Input, OnInit, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChartConfiguration, ChartData, ChartType as ChartJsType, Plugin } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { BaseChartDirective } from 'ng2-charts';
import {
	buildChartData,
	buildChartOptions,
	buildDataLabelsPlugin,
	getMappedChartType,
} from 'src/app/lib/chart-config.helper';
import { DashboardWidget } from 'src/app/models/dashboard';
import { ChartWidgetOptions, SavedQuery } from 'src/app/models/saved-query';

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

		const chartType = query.chart_type || 'bar';
		const widgetOptions = this._resolveWidgetOptions(query, data);

		return buildChartData(data, chartType, widgetOptions);
	});

	protected chartOptions = computed<ChartConfiguration['options']>(() => {
		const query = this.savedQuery();
		const data = this.data();
		if (!query || !data.length) return this._getDefaultOptions();

		const chartType = query.chart_type || 'bar';
		const widgetOptions = this._resolveWidgetOptions(query, data);

		return buildChartOptions(chartType, widgetOptions);
	});

	protected chartPlugins = computed<Plugin[]>(() => {
		const query = this.savedQuery();
		if (!query) return [];

		const widgetOptions = (query.widget_options ?? {}) as unknown as ChartWidgetOptions;
		return [buildDataLabelsPlugin(widgetOptions)];
	});

	ngOnInit(): void {
		if (this.preloadedQuery) {
			this.savedQuery.set(this.preloadedQuery);
		}
		if (this.preloadedData.length > 0) {
			this.data.set(this.preloadedData);
		}
	}

	get mappedChartType(): ChartJsType {
		const query = this.savedQuery();
		const chartType = query?.chart_type || 'bar';
		const widgetOptions = (query?.widget_options ?? {}) as unknown as ChartWidgetOptions;
		return getMappedChartType(chartType, widgetOptions);
	}

	private _resolveWidgetOptions(query: SavedQuery, data: Record<string, unknown>[]): ChartWidgetOptions {
		const raw = (query.widget_options ?? {}) as Partial<ChartWidgetOptions>;

		// Fallback label/value columns from data keys
		const labelColumn = raw.label_column || (data.length ? Object.keys(data[0])[0] : '') || '';
		const valueColumn =
			raw.value_column || (data.length ? Object.keys(data[0])[1] || Object.keys(data[0])[0] : '') || '';

		return {
			...raw,
			label_column: labelColumn,
			value_column: valueColumn,
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
