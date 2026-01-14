import { DashboardEntity } from '../dashboard.entity.js';
import { DashboardWidgetEntity } from '../dashboard-widget.entity.js';

export interface IDashboardRepository {
	findDashboardById(dashboardId: string): Promise<DashboardEntity | null>;
	findDashboardByIdAndConnectionId(dashboardId: string, connectionId: string): Promise<DashboardEntity | null>;
	findDashboardWithWidgets(dashboardId: string): Promise<DashboardEntity | null>;
	findAllDashboardsByConnectionId(connectionId: string): Promise<DashboardEntity[]>;
	saveDashboard(dashboard: DashboardEntity): Promise<DashboardEntity>;
	removeDashboard(dashboard: DashboardEntity): Promise<DashboardEntity>;
}

export interface IDashboardWidgetRepository {
	findWidgetById(widgetId: string): Promise<DashboardWidgetEntity | null>;
	findWidgetByIdAndDashboardId(widgetId: string, dashboardId: string): Promise<DashboardWidgetEntity | null>;
	findAllWidgetsByDashboardId(dashboardId: string): Promise<DashboardWidgetEntity[]>;
	saveWidget(widget: DashboardWidgetEntity): Promise<DashboardWidgetEntity>;
	removeWidget(widget: DashboardWidgetEntity): Promise<DashboardWidgetEntity>;
}
