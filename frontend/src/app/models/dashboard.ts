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
	position_x: number;
	position_y: number;
	width: number;
	height: number;
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
	position_x: number;
	position_y: number;
	width: number;
	height: number;
	query_id: string;
}

export interface UpdateWidgetPayload {
	position_x?: number;
	position_y?: number;
	width?: number;
	height?: number;
	query_id?: string;
}
