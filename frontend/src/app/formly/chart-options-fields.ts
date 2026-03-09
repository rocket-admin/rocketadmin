import { Signal } from '@angular/core';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { JSONSchema7 } from 'json-schema';
import { CHART_OPTIONS_SCHEMA, CONVERT_UNIT_OPTIONS } from './chart-options.schema';

export interface ChartOptionsModel {
	chartType: string;
	labelColumn: string;
	labelType: string;
	seriesMode: string;
	seriesColumn: string;
	seriesValueColumn: string;
	seriesList: {
		value_column: string;
		label?: string;
		color?: string;
		point_style?: string;
		fill?: boolean;
		tension?: number;
		type?: string;
	}[];
	stacked: boolean;
	horizontal: boolean;
	showDataLabels: boolean;
	legendShow: boolean;
	legendPosition: string;
	unitMode: string;
	unitsText: string;
	unitsPosition: string;
	convertUnit: string;
	decimalPlaces: number | null;
	thousandsSeparator: boolean;
	compact: boolean;
	yAxisTitle: string;
	yAxisMin: number | null;
	yAxisMax: number | null;
	yAxisBeginAtZero: boolean;
	yAxisScaleType: string;
	xAxisTitle: string;
	sortBy: string;
	limit: number | null;
	colorPalette: string[];
}

export const DEFAULT_CHART_OPTIONS_MODEL: ChartOptionsModel = {
	chartType: 'bar',
	labelColumn: '',
	labelType: 'values',
	seriesMode: 'manual',
	seriesColumn: '',
	seriesValueColumn: '',
	seriesList: [],
	stacked: false,
	horizontal: false,
	showDataLabels: false,
	legendShow: true,
	legendPosition: 'top',
	unitMode: 'none',
	unitsText: '',
	unitsPosition: 'suffix',
	convertUnit: '',
	decimalPlaces: null,
	thousandsSeparator: true,
	compact: false,
	yAxisTitle: '',
	yAxisMin: null,
	yAxisMax: null,
	yAxisBeginAtZero: true,
	yAxisScaleType: 'linear',
	xAxisTitle: '',
	sortBy: 'none',
	limit: null,
	colorPalette: [],
};

// ---------------------------------------------------------------------------
// Schema-driven field factory
// ---------------------------------------------------------------------------

function resolveOptions(prop: JSONSchema7): { value: string | number | boolean; label: string }[] | undefined {
	type SchemaConst = JSONSchema7 & { const: string };
	if (prop.oneOf) {
		return (prop.oneOf as SchemaConst[]).map((o) => ({
			value: o.const,
			label: o.title || String(o.const),
		}));
	}
	if (prop.enum) {
		return prop.enum.map((v) => ({ value: v as string | number | boolean, label: String(v) }));
	}
	return undefined;
}

function resolveType(prop: JSONSchema7): string {
	if (prop.oneOf || prop.enum) return 'select';
	if (prop.type === 'boolean') return 'checkbox';
	if (prop.type === 'number' || (Array.isArray(prop.type) && prop.type.includes('number'))) return 'input';
	return 'input';
}

/** Create a FormlyFieldConfig from a JSON Schema property + UI overrides. */
function createFieldFactory(schemaProps: Record<string, JSONSchema7>) {
	return (key: string, ui: Partial<FormlyFieldConfig> = {}): FormlyFieldConfig => {
		const prop = schemaProps[key];
		if (!prop) return { key, ...ui };

		const { props: uiProps, type: uiType, ...uiRest } = ui;

		const autoProps: Record<string, unknown> = {};
		if (prop.title) autoProps.label = prop.title;

		const options = resolveOptions(prop);
		if (options) autoProps.options = options;

		const type = uiType ?? resolveType(prop);

		if (type === 'input' && (prop.type === 'number' || (Array.isArray(prop.type) && prop.type.includes('number')))) {
			autoProps.type = 'number';
		}

		if (prop.minimum !== undefined) autoProps.min = prop.minimum;
		if (prop.maximum !== undefined) autoProps.max = prop.maximum;

		if (type === 'input' || type === 'select') {
			autoProps.appearance = 'outline';
		}

		return {
			...uiRest,
			key,
			type,
			props: { ...autoProps, ...uiProps },
		};
	};
}

const SCHEMA_PROPS = CHART_OPTIONS_SCHEMA.properties as Record<string, JSONSchema7>;
const SERIES_ITEM_PROPS = (SCHEMA_PROPS.seriesList as JSONSchema7 & { items: JSONSchema7 }).items.properties as Record<
	string,
	JSONSchema7
>;

/** Field builder for root-level schema properties */
const sf = createFieldFactory(SCHEMA_PROPS);

/** Field builder for series-item schema properties */
const ssf = createFieldFactory(SERIES_ITEM_PROPS);

function isPieType(model: ChartOptionsModel): boolean {
	return ['pie', 'doughnut', 'polarArea'].includes(model.chartType);
}

// ---------------------------------------------------------------------------
// Layout builder
// ---------------------------------------------------------------------------

export function buildChartOptionsFields(resultColumns: Signal<string[]>): FormlyFieldConfig[] {
	const columnOptions = () => resultColumns().map((c) => ({ value: c, label: c }));

	return [
		// Basic chart config
		{
			fieldGroupClassName: 'chart-config',
			fieldGroup: [
				sf('chartType', {
					className: 'chart-config-field',
					props: { required: true, attributes: { 'data-testid': 'chart-type-select' } },
				}),
				sf('labelColumn', {
					className: 'chart-config-field',
					props: { required: true, attributes: { 'data-testid': 'label-column-select' } },
					expressions: { 'props.options': () => columnOptions() },
				}),
				sf('labelType', {
					className: 'chart-config-field',
					props: { attributes: { 'data-testid': 'label-type-select' } },
					expressions: { hide: (field) => !['bar', 'line'].includes(field.model.chartType) },
				}),
			],
		},

		// Series section
		{
			fieldGroupClassName: 'series-section',
			fieldGroup: [
				sf('seriesMode', {
					className: 'series-mode-field',
					expressions: { hide: (field) => isPieType(field.model) },
				}),

				// Column mode fields
				{
					fieldGroupClassName: 'series-column-config',
					expressions: { hide: (field) => field.model.seriesMode !== 'column' || isPieType(field.model) },
					fieldGroup: [
						sf('seriesColumn', {
							className: 'series-field',
							props: { description: 'Categorical column to split into datasets' },
							expressions: { 'props.options': () => columnOptions() },
						}),
						sf('seriesValueColumn', {
							className: 'series-field',
							props: { description: 'Numeric column to chart' },
							expressions: { 'props.options': () => columnOptions() },
						}),
					],
				},

				// Manual series list
				{
					key: 'seriesList',
					type: 'repeat',
					props: {
						label: (SCHEMA_PROPS.seriesList as JSONSchema7).title,
						addText: 'Add series',
						itemLabel: 'Series',
					},
					expressions: {
						hide: (field) => field.model.seriesMode === 'column' && !isPieType(field.model),
						'props.maxItems': (field) => (isPieType(field.model) ? 1 : undefined),
					},
					fieldArray: {
						fieldGroupClassName: 'series-fields-group',
						fieldGroup: [
							{
								fieldGroupClassName: 'series-fields',
								fieldGroup: [
									ssf('value_column', {
										className: 'series-field',
										props: { required: true },
										expressions: { 'props.options': () => columnOptions() },
									}),
									ssf('label', {
										className: 'series-field',
										props: { placeholder: 'Auto' },
									}),
									{
										key: 'color',
										type: 'color-picker',
										expressions: {
											hide: (field) => isPieType(field.parent?.parent?.parent?.model),
										},
									},
									ssf('point_style', {
										className: 'series-field',
										expressions: {
											hide: (field) => {
												const root = field.parent?.parent?.parent?.model;
												return isPieType(root) || root?.chartType === 'bar';
											},
										},
									}),
								],
							},
							{
								fieldGroupClassName: 'series-options',
								expressions: { hide: (field) => isPieType(field.parent?.parent?.model) },
								fieldGroup: [
									ssf('fill', {
										type: 'checkbox',
										className: 'series-option-checkbox',
										expressions: {
											hide: (field) => {
												const root = field.parent?.parent?.parent?.parent?.model;
												const series = field.parent?.parent?.model;
												return root?.chartType !== 'line' && series?.type !== 'line';
											},
										},
									}),
									ssf('tension', {
										className: 'series-field series-field--small',
										props: { step: 0.1 },
										expressions: {
											hide: (field) => {
												const root = field.parent?.parent?.parent?.parent?.model;
												const series = field.parent?.parent?.model;
												return root?.chartType !== 'line' && series?.type !== 'line';
											},
										},
									}),
									ssf('type', {
										className: 'series-field',
										expressions: {
											hide: (field) => {
												const root = field.parent?.parent?.parent?.parent?.model;
												return (root?.seriesList?.length || 0) <= 1;
											},
										},
									}),
								],
							},
						],
					},
				},
			],
		},

		// Display options (expansion panel)
		{
			wrappers: ['expansion-panel'],
			props: { label: 'Display options' },
			fieldGroupClassName: 'option-group',
			fieldGroup: [
				sf('stacked', { expressions: { hide: (field) => isPieType(field.model) } }),
				sf('horizontal', { expressions: { hide: (field) => field.model.chartType !== 'bar' } }),
				sf('showDataLabels'),
				sf('legendShow'),
				sf('legendPosition', {
					className: 'option-field',
					expressions: { hide: (field) => !field.model.legendShow },
				}),
			],
		},

		// Units & formatting (expansion panel)
		{
			wrappers: ['expansion-panel'],
			props: { label: 'Units & formatting' },
			fieldGroupClassName: 'option-group',
			fieldGroup: [
				sf('unitMode', { className: 'option-field' }),
				{
					fieldGroupClassName: 'inline-fields',
					expressions: { hide: (field) => field.model.unitMode !== 'custom' },
					fieldGroup: [
						sf('unitsText', {
							className: 'option-field',
							props: { placeholder: 'e.g. $, %, EUR' },
						}),
						sf('unitsPosition', { className: 'option-field' }),
					],
				},
				sf('convertUnit', {
					className: 'option-field',
					props: { options: CONVERT_UNIT_OPTIONS, description: 'Values auto-convert to the best readable unit' },
					expressions: { hide: (field) => field.model.unitMode !== 'convert' },
				}),
				{
					fieldGroupClassName: 'inline-fields',
					expressions: { hide: (field) => field.model.unitMode === 'convert' },
					fieldGroup: [sf('decimalPlaces', { className: 'option-field' })],
				},
				sf('thousandsSeparator', {
					expressions: { hide: (field) => field.model.unitMode === 'convert' },
				}),
				sf('compact', {
					expressions: { hide: (field) => field.model.unitMode === 'convert' },
				}),
			],
		},

		// Axis configuration (expansion panel, non-pie only)
		{
			wrappers: ['expansion-panel'],
			props: { label: 'Axis configuration' },
			expressions: { hide: (field) => isPieType(field.model) },
			fieldGroupClassName: 'option-group',
			fieldGroup: [
				{ template: '<h4 class="axis-label">Y-Axis</h4>' },
				{
					fieldGroupClassName: 'inline-fields',
					fieldGroup: [
						sf('yAxisTitle', { className: 'option-field' }),
						sf('yAxisScaleType', { className: 'option-field' }),
					],
				},
				{
					fieldGroupClassName: 'inline-fields',
					fieldGroup: [sf('yAxisMin', { className: 'option-field' }), sf('yAxisMax', { className: 'option-field' })],
				},
				sf('yAxisBeginAtZero'),
				{ template: '<h4 class="axis-label">X-Axis</h4>' },
				sf('xAxisTitle', { className: 'option-field' }),
			],
		},

		// Data options (expansion panel)
		{
			wrappers: ['expansion-panel'],
			props: { label: 'Data options' },
			fieldGroupClassName: 'option-group',
			fieldGroup: [
				{
					fieldGroupClassName: 'inline-fields',
					fieldGroup: [
						sf('sortBy', { className: 'option-field' }),
						sf('limit', { className: 'option-field', props: { placeholder: 'No limit' } }),
					],
				},
			],
		},

		// Color palette (expansion panel)
		{
			wrappers: ['expansion-panel'],
			props: { label: 'Custom color palette' },
			fieldGroup: [
				{
					key: 'colorPalette',
					type: 'color-palette',
					fieldArray: { type: 'palette-color-input' },
				},
			],
		},
	];
}
