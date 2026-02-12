import { ChartConfiguration, ChartData, ChartType as ChartJsType, Plugin } from 'chart.js';
import {
	ChartAxisConfig,
	ChartNumberFormatConfig,
	ChartSeriesConfig,
	ChartType,
	ChartUnitConfig,
	ChartWidgetOptions,
} from '../models/saved-query';

const DEFAULT_COLOR_PALETTE = [
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

export function formatChartValue(
	value: number,
	units?: ChartUnitConfig,
	numberFormat?: ChartNumberFormatConfig,
): string {
	let formatted: string;

	if (numberFormat?.compact) {
		formatted = compactNumber(value);
	} else {
		formatted = new Intl.NumberFormat(undefined, {
			minimumFractionDigits: numberFormat?.decimal_places,
			maximumFractionDigits: numberFormat?.decimal_places,
			useGrouping: numberFormat?.thousands_separator ?? true,
		}).format(value);
	}

	if (!units) return formatted;
	return units.position === 'prefix' ? `${units.text}${formatted}` : `${formatted}${units.text}`;
}

function compactNumber(value: number): string {
	const abs = Math.abs(value);
	if (abs >= 1e9) return (value / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
	if (abs >= 1e6) return (value / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
	if (abs >= 1e3) return (value / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
	return String(value);
}

function solidColor(rgba: string): string {
	return rgba.replace('0.8)', '1)');
}

function parseDate(value: unknown): Date | null {
	if (!value) return null;
	try {
		const date = new Date(value as string | number | Date);
		return isNaN(date.getTime()) ? null : date;
	} catch {
		return null;
	}
}

function extractNumericValue(val: unknown): number {
	return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
}

function sortData(
	data: Record<string, unknown>[],
	sortBy: string,
	labelColumn: string,
	valueColumn?: string,
): Record<string, unknown>[] {
	const sorted = [...data];
	switch (sortBy) {
		case 'label_asc':
			sorted.sort((a, b) => String(a[labelColumn] ?? '').localeCompare(String(b[labelColumn] ?? '')));
			break;
		case 'label_desc':
			sorted.sort((a, b) => String(b[labelColumn] ?? '').localeCompare(String(a[labelColumn] ?? '')));
			break;
		case 'value_asc':
			if (valueColumn) {
				sorted.sort((a, b) => extractNumericValue(a[valueColumn]) - extractNumericValue(b[valueColumn]));
			}
			break;
		case 'value_desc':
			if (valueColumn) {
				sorted.sort((a, b) => extractNumericValue(b[valueColumn]) - extractNumericValue(a[valueColumn]));
			}
			break;
	}
	return sorted;
}

export function buildChartData(
	rawData: Record<string, unknown>[],
	chartType: ChartType,
	options: ChartWidgetOptions,
): ChartData<ChartJsType> | null {
	if (!rawData.length) return null;

	const palette = options.color_palette ?? DEFAULT_COLOR_PALETTE;
	const isPieType = ['pie', 'doughnut', 'polarArea'].includes(chartType);
	const labelType = options.label_type ?? 'values';
	const useTimeScale = labelType === 'datetime' && !isPieType;
	const labelColumn = options.label_column;

	if (!labelColumn) return null;

	// Resolve series
	const seriesConfigs: ChartSeriesConfig[] = options.series?.length
		? options.series
		: options.value_column
			? [{ value_column: options.value_column }]
			: [];

	if (!seriesConfigs.length) return null;

	// Pre-process data: sort and limit
	let processedData = [...rawData];
	if (options.sort_by && options.sort_by !== 'none') {
		processedData = sortData(processedData, options.sort_by, labelColumn, seriesConfigs[0]?.value_column);
	}
	if (options.limit) {
		processedData = processedData.slice(0, options.limit);
	}

	if (useTimeScale) {
		const datasets = seriesConfigs.map((s, i) => {
			const color = s.color ?? palette[i % palette.length];
			const dataPoints = processedData
				.map((row) => {
					const date = parseDate(row[labelColumn]);
					if (!date) return null;
					return {
						x: date.getTime(),
						y: extractNumericValue(row[s.value_column]),
					};
				})
				.filter((point): point is { x: number; y: number } => point !== null)
				.sort((a, b) => a.x - b.x);

			return {
				label: s.label ?? s.value_column,
				data: dataPoints,
				backgroundColor: color,
				borderColor: solidColor(color),
				borderWidth: 1,
				fill: s.fill ?? false,
				tension: s.tension ?? 0,
				pointStyle:
					s.point_style === 'none'
						? ('circle' as const)
						: ((s.point_style ?? 'circle') as 'circle' | 'rect' | 'triangle' | 'cross'),
				pointRadius: s.point_style === 'none' ? 0 : undefined,
				spanGaps: false,
				type: s.type as ChartJsType | undefined,
			};
		});

		return { datasets };
	}

	// Categorical scale
	const labels = processedData.map((row) => String(row[labelColumn] ?? ''));

	if (isPieType) {
		// Pie/doughnut/polarArea: single dataset with per-slice colors
		const s = seriesConfigs[0];
		const values = processedData.map((row) => extractNumericValue(row[s.value_column]));
		const sliceColors = s.colors ?? palette.slice(0, values.length);
		const borderColors = sliceColors.map((c) => solidColor(c));

		// If palette is shorter than values, cycle
		const bgColors = values.map((_, i) => sliceColors[i % sliceColors.length]);
		const bdColors = values.map((_, i) => borderColors[i % borderColors.length]);

		return {
			labels,
			datasets: [
				{
					label: s.label ?? s.value_column,
					data: values,
					backgroundColor: bgColors,
					borderColor: bdColors,
					borderWidth: 1,
				},
			],
		};
	}

	// Bar/line: multi-series
	const datasets = seriesConfigs.map((s, i) => {
		const color = s.color ?? palette[i % palette.length];
		const values = processedData.map((row) => extractNumericValue(row[s.value_column]));

		return {
			label: s.label ?? s.value_column,
			data: values,
			backgroundColor: color,
			borderColor: solidColor(color),
			borderWidth: 1,
			fill: s.fill ?? false,
			tension: s.tension ?? 0,
			pointStyle:
				s.point_style === 'none'
					? ('circle' as const)
					: ((s.point_style ?? 'circle') as 'circle' | 'rect' | 'triangle' | 'cross'),
			pointRadius: s.point_style === 'none' ? 0 : undefined,
			type: s.type as ChartJsType | undefined,
		};
	});

	return { labels, datasets };
}

function buildAxisConfig(
	axisConfig: ChartAxisConfig | undefined,
	defaults?: { beginAtZero?: boolean },
): Record<string, unknown> {
	const config: Record<string, unknown> = {};

	if (axisConfig?.title) {
		config['title'] = { display: true, text: axisConfig.title };
	}
	if (axisConfig?.min !== undefined) {
		config['min'] = axisConfig.min;
	}
	if (axisConfig?.max !== undefined) {
		config['max'] = axisConfig.max;
	}

	const beginAtZero = axisConfig?.begin_at_zero ?? defaults?.beginAtZero;
	if (beginAtZero !== undefined) {
		config['beginAtZero'] = beginAtZero;
	}

	if (axisConfig?.scale_type === 'logarithmic') {
		config['type'] = 'logarithmic';
	}

	return config;
}

export function buildChartOptions(chartType: ChartType, options: ChartWidgetOptions): ChartConfiguration['options'] {
	const isPieType = ['pie', 'doughnut', 'polarArea'].includes(chartType);
	const labelType = options.label_type ?? 'values';
	const useTimeScale = labelType === 'datetime' && !isPieType;

	const seriesConfigs: ChartSeriesConfig[] = options.series?.length
		? options.series
		: options.value_column
			? [{ value_column: options.value_column }]
			: [];

	const globalUnits = options.units;
	const globalFormat = options.number_format;

	const chartOptions: ChartConfiguration['options'] = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: options.legend?.show ?? true,
				position: options.legend?.position ?? 'top',
			},
			tooltip: {
				callbacks: {
					label: (context) => {
						const seriesIndex = context.datasetIndex ?? 0;
						const seriesConfig = seriesConfigs[seriesIndex];
						const units = seriesConfig?.units ?? globalUnits;
						const numFormat = seriesConfig?.number_format ?? globalFormat;
						const raw = context.parsed?.y ?? context.parsed ?? context.raw;
						const value =
							typeof raw === 'number'
								? raw
								: typeof raw === 'object' && raw !== null
									? ((raw as { y?: number }).y ?? 0)
									: 0;
						const label = context.dataset.label ?? '';
						const formatted = formatChartValue(value, units, numFormat);
						return `${label}: ${formatted}`;
					},
				},
			},
		},
	};

	if (options.horizontal && !isPieType) {
		(chartOptions as Record<string, unknown>)['indexAxis'] = 'y';
	}

	// Scales for non-pie types
	if (!isPieType) {
		const scales: Record<string, unknown> = {};

		if (useTimeScale) {
			scales['x'] = {
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
				...buildAxisConfig(options.x_axis),
				...(options.stacked ? { stacked: true } : {}),
			};
		} else {
			const xConfig = buildAxisConfig(options.x_axis);
			scales['x'] = {
				...xConfig,
				...(options.stacked ? { stacked: true } : {}),
			};
		}

		const yConfig = buildAxisConfig(options.y_axis, { beginAtZero: true });
		scales['y'] = {
			...yConfig,
			...(options.stacked ? { stacked: true } : {}),
		};

		// Tick formatting for value axis
		const tickAxis = options.horizontal ? 'x' : 'y';
		if (globalUnits || globalFormat) {
			const axisObj = scales[tickAxis] as Record<string, unknown>;
			axisObj['ticks'] = {
				callback: (tickValue: string | number) => {
					const value = typeof tickValue === 'number' ? tickValue : parseFloat(tickValue);
					return formatChartValue(value, globalUnits, globalFormat);
				},
			};
		}

		(chartOptions as Record<string, unknown>)['scales'] = scales;
	}

	return chartOptions;
}

export function buildDataLabelsPlugin(options: ChartWidgetOptions): Plugin | null {
	if (!options.show_data_labels) return null;

	const globalUnits = options.units;
	const globalFormat = options.number_format;

	const seriesConfigs: ChartSeriesConfig[] = options.series?.length
		? options.series
		: options.value_column
			? [{ value_column: options.value_column }]
			: [];

	return {
		id: 'customDataLabels',
		afterDatasetsDraw(chart) {
			const { ctx } = chart;
			ctx.save();
			ctx.font = '11px sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'bottom';

			chart.data.datasets.forEach((dataset, datasetIndex) => {
				const meta = chart.getDatasetMeta(datasetIndex);
				const seriesConfig = seriesConfigs[datasetIndex];
				const units = seriesConfig?.units ?? globalUnits;
				const numFormat = seriesConfig?.number_format ?? globalFormat;

				meta.data.forEach((element, index) => {
					const raw = dataset.data[index];
					let value: number;
					if (typeof raw === 'number') {
						value = raw;
					} else if (raw && typeof raw === 'object' && 'y' in raw) {
						value = (raw as { y: number }).y;
					} else {
						return;
					}

					const formatted = formatChartValue(value, units, numFormat);
					const { x, y } = element.tooltipPosition(false);
					ctx.fillStyle = '#666';
					ctx.fillText(formatted, x, y - 5);
				});
			});

			ctx.restore();
		},
	};
}

export function getMappedChartType(chartType: ChartType, options: ChartWidgetOptions): ChartJsType {
	// For mixed charts, the base type is used but individual datasets may override
	const hasMixedTypes = options.series?.some((s) => s.type) ?? false;
	if (hasMixedTypes) {
		// Use 'bar' as base for mixed charts - individual series override via dataset.type
		return 'bar' as ChartJsType;
	}
	return chartType as ChartJsType;
}
