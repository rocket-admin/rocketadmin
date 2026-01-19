import { DashboardWidgetTypeEnum } from '../../../../enums/dashboard-widget-type.enum.js';

export class CreateDashboardWidgetDs {
	dashboardId: string;
	connectionId: string;
	masterPassword: string;
	userId: string;
	widget_type: DashboardWidgetTypeEnum;
	name?: string;
	description?: string;
	position_x?: number;
	position_y?: number;
	width?: number;
	height?: number;
	widget_options?: Record<string, unknown>;
	query_id?: string;
}
