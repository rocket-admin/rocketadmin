export type DashboardWidgetType = 'table' | 'chart' | 'counter' | 'text';

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'polarArea';

export interface ChartUnitConfig {
	text: string;
	position: 'prefix' | 'suffix';
}

export interface ChartNumberFormatConfig {
	decimal_places?: number;
	thousands_separator?: boolean;
	compact?: boolean;
}

export interface ChartLegendConfig {
	show?: boolean;
	position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface ChartAxisConfig {
	title?: string;
	min?: number;
	max?: number;
	begin_at_zero?: boolean;
	scale_type?: 'linear' | 'logarithmic';
}

export interface ChartSeriesConfig {
	value_column: string;
	label?: string;
	color?: string;
	colors?: string[];
	units?: ChartUnitConfig;
	number_format?: ChartNumberFormatConfig;
	fill?: boolean;
	tension?: number;
	point_style?: 'circle' | 'rect' | 'triangle' | 'cross' | 'none';
	type?: 'bar' | 'line';
}

export interface ChartWidgetOptions {
	label_column: string;
	value_column?: string;
	label_type?: 'values' | 'datetime';
	series?: ChartSeriesConfig[];
	units?: ChartUnitConfig;
	number_format?: ChartNumberFormatConfig;
	color_palette?: string[];
	legend?: ChartLegendConfig;
	stacked?: boolean;
	horizontal?: boolean;
	show_data_labels?: boolean;
	y_axis?: ChartAxisConfig;
	x_axis?: ChartAxisConfig;
	sort_by?: 'label_asc' | 'label_desc' | 'value_asc' | 'value_desc' | 'none';
	limit?: number;
}

export interface SavedQuery {
	id: string;
	name: string;
	description: string | null;
	widget_type: DashboardWidgetType;
	chart_type: ChartType | null;
	widget_options: Record<string, unknown> | null;
	query_text: string;
	connection_id: string;
	created_at: string;
	updated_at: string;
}

export interface CreateSavedQueryPayload {
	name: string;
	description?: string;
	widget_type?: DashboardWidgetType;
	chart_type?: ChartType;
	widget_options?: Record<string, unknown>;
	query_text: string;
}

export interface UpdateSavedQueryPayload {
	name?: string;
	description?: string;
	widget_type?: DashboardWidgetType;
	chart_type?: ChartType;
	widget_options?: Record<string, unknown>;
	query_text?: string;
}

export interface QueryExecutionResult {
	query_id: string;
	query_name: string;
	data: Record<string, unknown>[];
	execution_time_ms: number;
}

export interface TestQueryPayload {
	query_text: string;
	tableName?: string;
}

export interface TestQueryResult {
	data: Record<string, unknown>[];
	execution_time_ms: number;
}
