export type DashboardWidgetType = 'table' | 'chart' | 'counter' | 'text';

export interface Dashboard {
	id: string;
	name: string;
	description: string | null;
	connection_id: string;
	created_at: string;
	updated_at: string;
	widgets?: DashboardWidget[];
}

export interface DashboardWidget {
	id: string;
	widget_type: DashboardWidgetType;
	chart_type?: string;
	name: string;
	description: string | null;
	position_x: number;
	position_y: number;
	width: number;
	height: number;
	widget_options: Record<string, unknown>;
	query_id: string | null;
	dashboard_id: string;
}

export interface CreateDashboardPayload {
	name: string;
	description?: string;
}

export interface UpdateDashboardPayload {
	name?: string;
	description?: string;
}

export interface CreateWidgetPayload {
	widget_type: DashboardWidgetType;
	chart_type?: string;
	name: string;
	description?: string;
	position_x: number;
	position_y: number;
	width: number;
	height: number;
	widget_options?: Record<string, unknown>;
	query_id?: string;
}

export interface UpdateWidgetPayload {
	widget_type?: DashboardWidgetType;
	chart_type?: string;
	name?: string;
	description?: string;
	position_x?: number;
	position_y?: number;
	width?: number;
	height?: number;
	widget_options?: Record<string, unknown>;
	query_id?: string;
}
