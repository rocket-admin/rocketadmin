export type DashboardWidgetType = 'table' | 'chart' | 'counter' | 'text';

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'polarArea';

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
