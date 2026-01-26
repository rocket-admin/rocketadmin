import { DashboardWidgetEntity } from '../dashboard-widget.entity.js';

export interface IDashboardWidgetRepository {
	findWidgetById(widgetId: string): Promise<DashboardWidgetEntity | null>;
	findWidgetByIdAndDashboardId(widgetId: string, dashboardId: string): Promise<DashboardWidgetEntity | null>;
	findAllWidgetsByDashboardId(dashboardId: string): Promise<DashboardWidgetEntity[]>;
	saveWidget(widget: DashboardWidgetEntity): Promise<DashboardWidgetEntity>;
	removeWidget(widget: DashboardWidgetEntity): Promise<DashboardWidgetEntity>;
}
