import { DashboardWidgetTypeEnum } from '../../../../enums/dashboard-widget-type.enum.js';

export class UpdateSavedDbQueryDs {
	queryId: string;
	connectionId: string;
	masterPassword: string;
	name?: string;
	description?: string;
	widget_type?: DashboardWidgetTypeEnum;
	chart_type?: string;
	widget_options?: Record<string, unknown>;
	query_text?: string;
}
