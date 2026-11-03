// The panel editor's chart configuration, pulled out of ChartEditView so the series and advanced
// option sections can live in their own components (they inject it) and the option round-trip can
// be tested without a page. Port of the chart config signals, `currentWidgetOptions`, the series and
// palette helpers, and the two "apply saved options" blocks of chart-edit.component.ts.
import { computed, type InjectionKey, inject, provide, ref } from 'vue';
import type { SelectOption } from '@/components/ui';
import { DEFAULT_COLOR_PALETTE } from '@/lib/chart-config.helper';
import type {
	ChartAxisConfig,
	ChartNumberFormatConfig,
	ChartSeriesConfig,
	ChartType,
	ChartWidgetOptions,
} from '@/models/saved-query';

export type LabelType = 'values' | 'datetime';
export type SeriesMode = 'manual' | 'column';
export type LegendPosition = 'top' | 'bottom' | 'left' | 'right';
export type UnitMode = 'none' | 'custom' | 'convert';
export type SortBy = NonNullable<ChartWidgetOptions['sort_by']>;
export type ScaleType = 'linear' | 'logarithmic';
export type PointStyle = NonNullable<ChartSeriesConfig['point_style']>;

/** The colour a new palette entry (and an un-coloured series' picker) starts at. */
export const DEFAULT_PICKER_COLOR = '#6366f1';

export const CHART_TYPES: SelectOption<ChartType>[] = [
	{ value: 'bar', label: 'Bar Chart' },
	{ value: 'line', label: 'Line Chart' },
	{ value: 'pie', label: 'Pie Chart' },
	{ value: 'doughnut', label: 'Doughnut Chart' },
	{ value: 'polarArea', label: 'Polar Area Chart' },
];

export const LABEL_TYPES: SelectOption<LabelType>[] = [
	{ value: 'values', label: 'Values' },
	{ value: 'datetime', label: 'Datetime' },
];

export const SERIES_MODES: SelectOption<SeriesMode>[] = [
	{ value: 'manual', label: 'Manual' },
	{ value: 'column', label: 'Series from column' },
];

export const LEGEND_POSITIONS: SelectOption<LegendPosition>[] = [
	{ value: 'top', label: 'Top' },
	{ value: 'bottom', label: 'Bottom' },
	{ value: 'left', label: 'Left' },
	{ value: 'right', label: 'Right' },
];

export const SORT_OPTIONS: SelectOption<SortBy>[] = [
	{ value: 'none', label: 'None' },
	{ value: 'label_asc', label: 'Label (A-Z)' },
	{ value: 'label_desc', label: 'Label (Z-A)' },
	{ value: 'value_asc', label: 'Value (Low-High)' },
	{ value: 'value_desc', label: 'Value (High-Low)' },
];

export const SCALE_TYPES: SelectOption<ScaleType>[] = [
	{ value: 'linear', label: 'Linear' },
	{ value: 'logarithmic', label: 'Logarithmic' },
];

export const POINT_STYLES: SelectOption<PointStyle>[] = [
	{ value: 'circle', label: 'Circle' },
	{ value: 'rect', label: 'Rectangle' },
	{ value: 'triangle', label: 'Triangle' },
	{ value: 'cross', label: 'Cross' },
	{ value: 'none', label: 'None' },
];

export const UNIT_MODES: SelectOption<UnitMode>[] = [
	{ value: 'none', label: 'None' },
	{ value: 'custom', label: 'Custom text' },
	{ value: 'convert', label: 'Auto-convert' },
];

export const UNIT_POSITIONS: SelectOption<'prefix' | 'suffix'>[] = [
	{ value: 'prefix', label: 'Prefix ($100)' },
	{ value: 'suffix', label: 'Suffix (100ms)' },
];

/** `''` is "Default" (no override). */
export const SERIES_TYPE_OVERRIDES: SelectOption<'' | 'bar' | 'line'>[] = [
	{ value: '', label: 'Default' },
	{ value: 'bar', label: 'Bar' },
	{ value: 'line', label: 'Line' },
];

const CONVERT_UNIT_GROUPS: { group: string; units: [value: string, label: string][] }[] = [
	{
		group: 'Time',
		units: [
			['ms', 'Milliseconds (ms)'],
			['s', 'Seconds (s)'],
			['min', 'Minutes (min)'],
			['h', 'Hours (h)'],
			['d', 'Days (d)'],
		],
	},
	{
		group: 'Data',
		units: [
			['B', 'Bytes (B)'],
			['KB', 'Kilobytes (KB)'],
			['MB', 'Megabytes (MB)'],
			['GB', 'Gigabytes (GB)'],
			['TB', 'Terabytes (TB)'],
		],
	},
	{
		group: 'Length',
		units: [
			['mm', 'Millimeters (mm)'],
			['cm', 'Centimeters (cm)'],
			['m', 'Meters (m)'],
			['km', 'Kilometers (km)'],
			['in', 'Inches (in)'],
			['ft', 'Feet (ft)'],
			['mi', 'Miles (mi)'],
		],
	},
	{
		group: 'Mass',
		units: [
			['mg', 'Milligrams (mg)'],
			['g', 'Grams (g)'],
			['kg', 'Kilograms (kg)'],
			['oz', 'Ounces (oz)'],
			['lb', 'Pounds (lb)'],
		],
	},
	{
		group: 'Temperature',
		units: [
			['C', 'Celsius (C)'],
			['F', 'Fahrenheit (F)'],
			['K', 'Kelvin (K)'],
		],
	},
	{
		group: 'Frequency',
		units: [
			['Hz', 'Hertz (Hz)'],
			['kHz', 'Kilohertz (kHz)'],
			['MHz', 'Megahertz (MHz)'],
			['GHz', 'Gigahertz (GHz)'],
		],
	},
	{
		group: 'Power',
		units: [
			['W', 'Watts (W)'],
			['kW', 'Kilowatts (kW)'],
			['MW', 'Megawatts (MW)'],
		],
	},
	{
		group: 'Energy',
		units: [
			['J', 'Joules (J)'],
			['Wh', 'Watt-hours (Wh)'],
			['kWh', 'Kilowatt-hours (kWh)'],
		],
	},
	{
		group: 'Pressure',
		units: [
			['Pa', 'Pascals (Pa)'],
			['bar', 'Bar'],
			['psi', 'PSI'],
			['atm', 'Atmospheres (atm)'],
		],
	},
	{
		group: 'Volume',
		units: [
			['mL', 'Milliliters (mL)'],
			['L', 'Liters (L)'],
			['gal', 'Gallons (gal)'],
		],
	},
];

/** The `mat-optgroup` list of source units, flattened for UiSelect's `group`. */
export const CONVERT_UNIT_OPTIONS: SelectOption<string>[] = CONVERT_UNIT_GROUPS.flatMap(({ group, units }) =>
	units.map(([value, label]) => ({ value, label, group })),
);

/** An `rgba(...)` or `#rrggbb[aa]` colour as the `#rrggbb` a colour input accepts. */
export function toHex(color: string | undefined): string {
	if (!color) return DEFAULT_PICKER_COLOR;
	if (color.startsWith('#')) return color.substring(0, 7);
	const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
	if (!match) return '#000000';
	const [r, g, b] = [match[1], match[2], match[3]].map((part) =>
		parseInt(part ?? '0', 10)
			.toString(16)
			.padStart(2, '0'),
	);
	return `#${r}${g}${b}`;
}

export function createChartEditorState() {
	// Query results the chart is configured against.
	const testResults = ref<Record<string, unknown>[]>([]);
	const resultColumns = ref<string[]>([]);

	// Basic chart config
	const chartType = ref<ChartType>('bar');
	const labelColumn = ref('');
	const labelType = ref<LabelType>('values');

	// Series config
	const seriesMode = ref<SeriesMode>('manual');
	const seriesList = ref<ChartSeriesConfig[]>([]);
	const seriesColumn = ref('');
	const seriesValueColumn = ref('');

	// Display options
	const stacked = ref(false);
	const horizontal = ref(false);
	const showDataLabels = ref(false);

	// Legend
	const legendShow = ref(true);
	const legendPosition = ref<LegendPosition>('top');

	// Units
	const unitMode = ref<UnitMode>('none');
	const unitsText = ref('');
	const unitsPosition = ref<'prefix' | 'suffix'>('suffix');
	const convertUnit = ref('');

	// Number format
	const decimalPlaces = ref<number | null>(null);
	const thousandsSeparator = ref(true);
	const compact = ref(false);

	// Y-axis
	const yAxisTitle = ref('');
	const yAxisMin = ref<number | null>(null);
	const yAxisMax = ref<number | null>(null);
	const yAxisBeginAtZero = ref(true);
	const yAxisScaleType = ref<ScaleType>('linear');

	// X-axis
	const xAxisTitle = ref('');

	// Sort & limit
	const sortBy = ref<SortBy>('none');
	const limit = ref<number | null>(null);

	// Color palette
	const colorPalette = ref<string[]>([]);

	const showLabelTypeOption = computed(() => ['bar', 'line'].includes(chartType.value));
	const isPieType = computed(() => ['pie', 'doughnut', 'polarArea'].includes(chartType.value));

	const hasChartData = computed(() => {
		const hasLabel = !!labelColumn.value;
		if (seriesMode.value === 'column') {
			return testResults.value.length > 0 && hasLabel && !!seriesColumn.value && !!seriesValueColumn.value;
		}
		const hasSeries = seriesList.value.length > 0 && seriesList.value.some((s) => !!s.value_column);
		return testResults.value.length > 0 && hasLabel && hasSeries;
	});

	const currentWidgetOptions = computed<ChartWidgetOptions>(() => {
		const options: ChartWidgetOptions = {
			label_column: labelColumn.value,
			label_type: labelType.value,
		};

		if (seriesMode.value === 'column' && seriesColumn.value) {
			options.series_column = seriesColumn.value;
			options.value_column = seriesValueColumn.value;
		} else if (seriesList.value.length > 0) {
			options.series = seriesList.value;
		}

		if (stacked.value) options.stacked = true;
		if (horizontal.value) options.horizontal = true;
		if (showDataLabels.value) options.show_data_labels = true;

		if (!legendShow.value || legendPosition.value !== 'top') {
			options.legend = { show: legendShow.value, position: legendPosition.value };
		}

		if (unitMode.value === 'custom' && unitsText.value) {
			options.units = { text: unitsText.value, position: unitsPosition.value };
		} else if (unitMode.value === 'convert' && convertUnit.value) {
			options.units = { convert_unit: convertUnit.value };
		}

		const numberFormat: ChartNumberFormatConfig = {};
		if (decimalPlaces.value !== null) numberFormat.decimal_places = decimalPlaces.value;
		if (!thousandsSeparator.value) numberFormat.thousands_separator = false;
		if (compact.value) numberFormat.compact = true;
		if (Object.keys(numberFormat).length > 0) options.number_format = numberFormat;

		const yAxis: ChartAxisConfig = {};
		if (yAxisTitle.value) yAxis.title = yAxisTitle.value;
		if (yAxisMin.value !== null) yAxis.min = yAxisMin.value;
		if (yAxisMax.value !== null) yAxis.max = yAxisMax.value;
		if (!yAxisBeginAtZero.value) yAxis.begin_at_zero = false;
		if (yAxisScaleType.value !== 'linear') yAxis.scale_type = yAxisScaleType.value;
		if (Object.keys(yAxis).length > 0) options.y_axis = yAxis;

		const xAxis: ChartAxisConfig = {};
		if (xAxisTitle.value) xAxis.title = xAxisTitle.value;
		if (Object.keys(xAxis).length > 0) options.x_axis = xAxis;

		if (sortBy.value !== 'none') options.sort_by = sortBy.value;
		if (limit.value !== null && limit.value > 0) options.limit = limit.value;

		if (colorPalette.value.length > 0) options.color_palette = colorPalette.value;

		return options;
	});

	/**
	 * Applies stored chart options. `'saved'` is loadSavedQuery (every option); `'ai'` is
	 * _applyAiResponse, which also resets the series mode and skips units, format, axes and sorting.
	 */
	function applyWidgetOptions(opts: Partial<ChartWidgetOptions>, source: 'saved' | 'ai'): void {
		if (opts.label_column) labelColumn.value = opts.label_column;
		if (opts.label_type) labelType.value = opts.label_type;

		if (opts.series_column) {
			seriesMode.value = 'column';
			seriesColumn.value = opts.series_column;
			if (opts.value_column) seriesValueColumn.value = opts.value_column;
		} else if (opts.series?.length) {
			if (source === 'ai') seriesMode.value = 'manual';
			seriesList.value = [...opts.series];
		} else if (opts.value_column) {
			// Legacy: a single value_column becomes one series.
			if (source === 'ai') seriesMode.value = 'manual';
			seriesList.value = [{ value_column: opts.value_column }];
		}

		if (opts.stacked) stacked.value = true;
		if (opts.horizontal) horizontal.value = true;
		if (opts.show_data_labels) showDataLabels.value = true;

		if (opts.legend) {
			if (opts.legend.show !== undefined) legendShow.value = opts.legend.show;
			if (opts.legend.position) legendPosition.value = opts.legend.position;
		}

		if (source === 'saved') applyFormattingOptions(opts);

		if (opts.color_palette?.length) colorPalette.value = [...opts.color_palette];
	}

	/** Fills the label column and the first series from a fresh result, when they are still unset. */
	function applyTestResults(data: Record<string, unknown>[]): void {
		testResults.value = data;
		resultColumns.value = data[0] ? Object.keys(data[0]) : [];
		const [first, second] = resultColumns.value;
		if (first !== undefined && !labelColumn.value) labelColumn.value = first;
		if (seriesList.value.length === 0 && second !== undefined) seriesList.value = [{ value_column: second }];
	}

	function addSeries(): void {
		const cols = resultColumns.value;
		const usedCols = new Set(seriesList.value.map((s) => s.value_column));
		const nextCol = cols.find((c) => c !== labelColumn.value && !usedCols.has(c)) || cols[0] || '';
		seriesList.value = [...seriesList.value, { value_column: nextCol }];
	}

	function removeSeries(index: number): void {
		seriesList.value = seriesList.value.filter((_, i) => i !== index);
	}

	function updateSeries<K extends keyof ChartSeriesConfig>(index: number, field: K, value: ChartSeriesConfig[K]): void {
		const current = seriesList.value[index];
		if (!current) return;
		const updated = [...seriesList.value];
		updated[index] = { ...current, [field]: value };
		seriesList.value = updated;
	}

	function addPaletteColor(): void {
		colorPalette.value = [...colorPalette.value, DEFAULT_PICKER_COLOR];
	}

	function removePaletteColor(index: number): void {
		colorPalette.value = colorPalette.value.filter((_, i) => i !== index);
	}

	function updatePaletteColor(index: number, value: string): void {
		const updated = [...colorPalette.value];
		updated[index] = value;
		colorPalette.value = updated;
	}

	function initializeDefaultPalette(): void {
		colorPalette.value = [...DEFAULT_COLOR_PALETTE];
	}

	function applyFormattingOptions(opts: Partial<ChartWidgetOptions>): void {
		if (opts.units) {
			if (opts.units.convert_unit) {
				unitMode.value = 'convert';
				convertUnit.value = opts.units.convert_unit;
			} else if (opts.units.text) {
				unitMode.value = 'custom';
				unitsText.value = opts.units.text;
				if (opts.units.position) unitsPosition.value = opts.units.position;
			}
		}

		if (opts.number_format) {
			if (opts.number_format.decimal_places !== undefined) decimalPlaces.value = opts.number_format.decimal_places;
			if (opts.number_format.thousands_separator !== undefined) {
				thousandsSeparator.value = opts.number_format.thousands_separator;
			}
			if (opts.number_format.compact) compact.value = true;
		}

		if (opts.y_axis) {
			if (opts.y_axis.title) yAxisTitle.value = opts.y_axis.title;
			if (opts.y_axis.min !== undefined) yAxisMin.value = opts.y_axis.min;
			if (opts.y_axis.max !== undefined) yAxisMax.value = opts.y_axis.max;
			if (opts.y_axis.begin_at_zero !== undefined) yAxisBeginAtZero.value = opts.y_axis.begin_at_zero;
			if (opts.y_axis.scale_type) yAxisScaleType.value = opts.y_axis.scale_type;
		}

		if (opts.x_axis?.title) xAxisTitle.value = opts.x_axis.title;

		if (opts.sort_by) sortBy.value = opts.sort_by;
		if (opts.limit) limit.value = opts.limit;
	}

	return {
		testResults,
		resultColumns,
		chartType,
		labelColumn,
		labelType,
		seriesMode,
		seriesList,
		seriesColumn,
		seriesValueColumn,
		stacked,
		horizontal,
		showDataLabels,
		legendShow,
		legendPosition,
		unitMode,
		unitsText,
		unitsPosition,
		convertUnit,
		decimalPlaces,
		thousandsSeparator,
		compact,
		yAxisTitle,
		yAxisMin,
		yAxisMax,
		yAxisBeginAtZero,
		yAxisScaleType,
		xAxisTitle,
		sortBy,
		limit,
		colorPalette,
		showLabelTypeOption,
		isPieType,
		hasChartData,
		currentWidgetOptions,
		applyWidgetOptions,
		applyTestResults,
		addSeries,
		removeSeries,
		updateSeries,
		addPaletteColor,
		removePaletteColor,
		updatePaletteColor,
		initializeDefaultPalette,
	};
}

export type ChartEditorState = ReturnType<typeof createChartEditorState>;

const CHART_EDITOR: InjectionKey<ChartEditorState> = Symbol('ChartEditor');

/** Called by ChartEditView. */
export function provideChartEditor(state: ChartEditorState): void {
	provide(CHART_EDITOR, state);
}

/** Inside ChartEditView: the editor state its sections bind to. */
export function useChartEditor(): ChartEditorState {
	const state = inject(CHART_EDITOR, null);
	if (!state) throw new Error('useChartEditor() must be called inside ChartEditView');
	return state;
}

/** A number input's value as the nullable number Angular's `+$event` produced (`''` is null). */
export function toOptionalNumber(value: string | number | null | undefined): number | null {
	if (value === '' || value === null || value === undefined) return null;
	const num = Number(value);
	return Number.isNaN(num) ? null : num;
}

/** What a single (non-`multiple`) UiSelect emits, typed as UiSelect types it. */
export type SelectModel<T> = T | T[] | null;

/** The chosen value of a single UiSelect. */
export function selected<T>(value: SelectModel<T>): T | null {
	return Array.isArray(value) ? (value[0] ?? null) : value;
}
