import { describe, expect, it } from 'vitest';
import { DEFAULT_COLOR_PALETTE } from '@/lib/chart-config.helper';
import { createChartEditorState, toHex, toOptionalNumber } from './chartEditor';

describe('createChartEditorState', () => {
	it('builds only the non-default options', () => {
		const state = createChartEditorState();
		expect(state.currentWidgetOptions.value).toEqual({ label_column: '', label_type: 'values' });

		state.labelColumn.value = 'month';
		state.seriesList.value = [{ value_column: 'total' }];
		state.legendPosition.value = 'bottom';
		state.unitMode.value = 'custom';
		state.unitsText.value = '$';
		state.unitsPosition.value = 'prefix';
		state.decimalPlaces.value = 2;
		state.thousandsSeparator.value = false;
		state.yAxisBeginAtZero.value = false;
		state.yAxisScaleType.value = 'logarithmic';
		state.xAxisTitle.value = 'Month';
		state.sortBy.value = 'value_desc';
		state.limit.value = 0;

		expect(state.currentWidgetOptions.value).toEqual({
			label_column: 'month',
			label_type: 'values',
			series: [{ value_column: 'total' }],
			legend: { show: true, position: 'bottom' },
			units: { text: '$', position: 'prefix' },
			number_format: { decimal_places: 2, thousands_separator: false },
			y_axis: { begin_at_zero: false, scale_type: 'logarithmic' },
			x_axis: { title: 'Month' },
			sort_by: 'value_desc',
		});
	});

	it('uses series_column + value_column in column mode', () => {
		const state = createChartEditorState();
		state.seriesMode.value = 'column';
		state.seriesColumn.value = 'region';
		state.seriesValueColumn.value = 'sales';
		state.seriesList.value = [{ value_column: 'ignored' }];

		expect(state.currentWidgetOptions.value).toMatchObject({ series_column: 'region', value_column: 'sales' });
		expect(state.currentWidgetOptions.value.series).toBeUndefined();
	});

	it('round-trips saved options, converting a legacy value_column to a series', () => {
		const state = createChartEditorState();
		state.applyWidgetOptions(
			{
				label_column: 'day',
				label_type: 'datetime',
				value_column: 'n',
				units: { convert_unit: 'ms' },
				y_axis: { min: 1, max: 9 },
				limit: 5,
				color_palette: ['#ff0000'],
			},
			'saved',
		);

		expect(state.currentWidgetOptions.value).toEqual({
			label_column: 'day',
			label_type: 'datetime',
			series: [{ value_column: 'n' }],
			units: { convert_unit: 'ms' },
			y_axis: { min: 1, max: 9 },
			limit: 5,
			color_palette: ['#ff0000'],
		});
	});

	it('ignores formatting options from an AI response and resets the series mode', () => {
		const state = createChartEditorState();
		state.seriesMode.value = 'column';
		state.applyWidgetOptions({ label_column: 'a', series: [{ value_column: 'b' }], sort_by: 'label_asc' }, 'ai');

		expect(state.seriesMode.value).toBe('manual');
		expect(state.sortBy.value).toBe('none');
	});

	it('reports chart data only with rows, a label column and a series', () => {
		const state = createChartEditorState();
		expect(state.hasChartData.value).toBe(false);
		state.testResults.value = [{ name: 'John' }];
		state.labelColumn.value = 'name';
		expect(state.hasChartData.value).toBe(false);
		state.seriesList.value = [{ value_column: 'count' }];
		expect(state.hasChartData.value).toBe(true);
	});

	it('adds a series on the next unused column', () => {
		const state = createChartEditorState();
		state.applyTestResults([{ name: 'a', x: 1, y: 2 }]);
		expect(state.labelColumn.value).toBe('name');
		expect(state.seriesList.value).toEqual([{ value_column: 'x' }]);

		state.addSeries();
		expect(state.seriesList.value[1]).toEqual({ value_column: 'y' });
		state.updateSeries(1, 'label', 'Y');
		expect(state.seriesList.value[1]).toEqual({ value_column: 'y', label: 'Y' });
		state.removeSeries(0);
		expect(state.seriesList.value).toEqual([{ value_column: 'y', label: 'Y' }]);
	});

	it('edits the colour palette', () => {
		const state = createChartEditorState();
		state.initializeDefaultPalette();
		expect(state.colorPalette.value).toEqual(DEFAULT_COLOR_PALETTE);
		state.updatePaletteColor(0, '#123456');
		state.removePaletteColor(1);
		expect(state.colorPalette.value[0]).toBe('#123456');
		expect(state.colorPalette.value).toHaveLength(DEFAULT_COLOR_PALETTE.length - 1);
	});
});

describe('toHex', () => {
	it('converts rgba and trims hex alpha', () => {
		expect(toHex('rgba(99, 102, 241, 0.8)')).toBe('#6366f1');
		expect(toHex('#11223344')).toBe('#112233');
		expect(toHex(undefined)).toBe('#6366f1');
		expect(toHex('red')).toBe('#000000');
	});
});

describe('toOptionalNumber', () => {
	it('treats an empty input as null', () => {
		expect(toOptionalNumber('')).toBeNull();
		expect(toOptionalNumber('3')).toBe(3);
		expect(toOptionalNumber(null)).toBeNull();
	});
});
