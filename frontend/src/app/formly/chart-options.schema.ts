import { JSONSchema7 } from 'json-schema';

export const CHART_OPTIONS_SCHEMA: JSONSchema7 = {
	type: 'object',
	properties: {
		chartType: {
			type: 'string',
			title: 'Chart type',
			oneOf: [
				{ const: 'bar', title: 'Bar Chart' },
				{ const: 'line', title: 'Line Chart' },
				{ const: 'pie', title: 'Pie Chart' },
				{ const: 'doughnut', title: 'Doughnut Chart' },
				{ const: 'polarArea', title: 'Polar Area Chart' },
			],
			default: 'bar',
		},
		labelColumn: {
			type: 'string',
			title: 'Label column',
		},
		labelType: {
			type: 'string',
			title: 'Label type',
			oneOf: [
				{ const: 'values', title: 'Values' },
				{ const: 'datetime', title: 'Datetime' },
			],
			default: 'values',
		},
		seriesMode: {
			type: 'string',
			title: 'Series mode',
			oneOf: [
				{ const: 'manual', title: 'Manual' },
				{ const: 'column', title: 'Series from column' },
			],
			default: 'manual',
		},
		seriesColumn: {
			type: 'string',
			title: 'Series column',
		},
		seriesValueColumn: {
			type: 'string',
			title: 'Value column',
		},
		seriesList: {
			type: 'array',
			title: 'Data series',
			items: {
				type: 'object',
				properties: {
					value_column: { type: 'string', title: 'Value column' },
					label: { type: 'string', title: 'Label' },
					color: { type: 'string', title: 'Color' },
					point_style: {
						type: 'string',
						title: 'Point style',
						oneOf: [
							{ const: 'circle', title: 'Circle' },
							{ const: 'rect', title: 'Rectangle' },
							{ const: 'triangle', title: 'Triangle' },
							{ const: 'cross', title: 'Cross' },
							{ const: 'none', title: 'None' },
						],
						default: 'circle',
					},
					fill: { type: 'boolean', title: 'Fill area', default: false },
					tension: { type: 'number', title: 'Tension', minimum: 0, maximum: 1, default: 0 },
					type: {
						type: 'string',
						title: 'Type override',
						oneOf: [
							{ const: '', title: 'Default' },
							{ const: 'bar', title: 'Bar' },
							{ const: 'line', title: 'Line' },
						],
					},
				},
				required: ['value_column'],
			},
		},
		stacked: { type: 'boolean', title: 'Stacked', default: false },
		horizontal: { type: 'boolean', title: 'Horizontal', default: false },
		showDataLabels: { type: 'boolean', title: 'Show data labels', default: false },
		legendShow: { type: 'boolean', title: 'Show legend', default: true },
		legendPosition: {
			type: 'string',
			title: 'Legend position',
			oneOf: [
				{ const: 'top', title: 'Top' },
				{ const: 'bottom', title: 'Bottom' },
				{ const: 'left', title: 'Left' },
				{ const: 'right', title: 'Right' },
			],
			default: 'top',
		},
		unitMode: {
			type: 'string',
			title: 'Unit mode',
			oneOf: [
				{ const: 'none', title: 'None' },
				{ const: 'custom', title: 'Custom text' },
				{ const: 'convert', title: 'Auto-convert' },
			],
			default: 'none',
		},
		unitsText: { type: 'string', title: 'Unit text' },
		unitsPosition: {
			type: 'string',
			title: 'Unit position',
			oneOf: [
				{ const: 'prefix', title: 'Prefix ($100)' },
				{ const: 'suffix', title: 'Suffix (100ms)' },
			],
			default: 'suffix',
		},
		convertUnit: { type: 'string', title: 'Source unit' },
		decimalPlaces: { type: ['number', 'null'] as any, title: 'Decimal places', minimum: 0, maximum: 10 },
		thousandsSeparator: { type: 'boolean', title: 'Thousands separator', default: true },
		compact: { type: 'boolean', title: 'Compact notation (1K, 1M, 1B)', default: false },
		yAxisTitle: { type: 'string', title: 'Title' },
		yAxisMin: { type: ['number', 'null'] as any, title: 'Min' },
		yAxisMax: { type: ['number', 'null'] as any, title: 'Max' },
		yAxisBeginAtZero: { type: 'boolean', title: 'Begin at zero', default: true },
		yAxisScaleType: {
			type: 'string',
			title: 'Scale type',
			oneOf: [
				{ const: 'linear', title: 'Linear' },
				{ const: 'logarithmic', title: 'Logarithmic' },
			],
			default: 'linear',
		},
		xAxisTitle: { type: 'string', title: 'Title' },
		sortBy: {
			type: 'string',
			title: 'Sort by',
			oneOf: [
				{ const: 'none', title: 'None' },
				{ const: 'label_asc', title: 'Label (A-Z)' },
				{ const: 'label_desc', title: 'Label (Z-A)' },
				{ const: 'value_asc', title: 'Value (Low-High)' },
				{ const: 'value_desc', title: 'Value (High-Low)' },
			],
			default: 'none',
		},
		limit: { type: ['number', 'null'] as any, title: 'Limit', minimum: 1, maximum: 10000 },
		colorPalette: {
			type: 'array',
			title: 'Custom color palette',
			items: { type: 'string' },
		},
	},
};

/** Grouped options for convert-unit select (can't be expressed in JSON Schema) */
export const CONVERT_UNIT_OPTIONS = [
	{
		label: 'Time',
		group: [
			{ value: 'ms', label: 'Milliseconds (ms)' },
			{ value: 's', label: 'Seconds (s)' },
			{ value: 'min', label: 'Minutes (min)' },
			{ value: 'h', label: 'Hours (h)' },
			{ value: 'd', label: 'Days (d)' },
		],
	},
	{
		label: 'Data',
		group: [
			{ value: 'B', label: 'Bytes (B)' },
			{ value: 'KB', label: 'Kilobytes (KB)' },
			{ value: 'MB', label: 'Megabytes (MB)' },
			{ value: 'GB', label: 'Gigabytes (GB)' },
			{ value: 'TB', label: 'Terabytes (TB)' },
		],
	},
	{
		label: 'Length',
		group: [
			{ value: 'mm', label: 'Millimeters (mm)' },
			{ value: 'cm', label: 'Centimeters (cm)' },
			{ value: 'm', label: 'Meters (m)' },
			{ value: 'km', label: 'Kilometers (km)' },
			{ value: 'in', label: 'Inches (in)' },
			{ value: 'ft', label: 'Feet (ft)' },
			{ value: 'mi', label: 'Miles (mi)' },
		],
	},
	{
		label: 'Mass',
		group: [
			{ value: 'mg', label: 'Milligrams (mg)' },
			{ value: 'g', label: 'Grams (g)' },
			{ value: 'kg', label: 'Kilograms (kg)' },
			{ value: 'oz', label: 'Ounces (oz)' },
			{ value: 'lb', label: 'Pounds (lb)' },
		],
	},
	{
		label: 'Temperature',
		group: [
			{ value: 'C', label: 'Celsius (C)' },
			{ value: 'F', label: 'Fahrenheit (F)' },
			{ value: 'K', label: 'Kelvin (K)' },
		],
	},
	{
		label: 'Frequency',
		group: [
			{ value: 'Hz', label: 'Hertz (Hz)' },
			{ value: 'kHz', label: 'Kilohertz (kHz)' },
			{ value: 'MHz', label: 'Megahertz (MHz)' },
			{ value: 'GHz', label: 'Gigahertz (GHz)' },
		],
	},
	{
		label: 'Power',
		group: [
			{ value: 'W', label: 'Watts (W)' },
			{ value: 'kW', label: 'Kilowatts (kW)' },
			{ value: 'MW', label: 'Megawatts (MW)' },
		],
	},
	{
		label: 'Energy',
		group: [
			{ value: 'J', label: 'Joules (J)' },
			{ value: 'Wh', label: 'Watt-hours (Wh)' },
			{ value: 'kWh', label: 'Kilowatt-hours (kWh)' },
		],
	},
	{
		label: 'Pressure',
		group: [
			{ value: 'Pa', label: 'Pascals (Pa)' },
			{ value: 'bar', label: 'Bar' },
			{ value: 'psi', label: 'PSI' },
			{ value: 'atm', label: 'Atmospheres (atm)' },
		],
	},
	{
		label: 'Volume',
		group: [
			{ value: 'mL', label: 'Milliliters (mL)' },
			{ value: 'L', label: 'Liters (L)' },
			{ value: 'gal', label: 'Gallons (gal)' },
		],
	},
];
