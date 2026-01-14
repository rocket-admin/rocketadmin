import { DashboardWidgetEntity } from '../dashboard-widget.entity.js';

export const dashboardWidgetCustomRepositoryExtension = {
	async findWidgetById(widgetId: string): Promise<DashboardWidgetEntity | null> {
		return await this.findOne({ where: { id: widgetId } });
	},

	async findWidgetByIdAndDashboardId(widgetId: string, dashboardId: string): Promise<DashboardWidgetEntity | null> {
		return await this.findOne({
			where: { id: widgetId, dashboard_id: dashboardId },
		});
	},

	async findAllWidgetsByDashboardId(dashboardId: string): Promise<DashboardWidgetEntity[]> {
		return await this.find({
			where: { dashboard_id: dashboardId },
			order: { position_y: 'ASC', position_x: 'ASC' },
		});
	},

	async saveWidget(widget: DashboardWidgetEntity): Promise<DashboardWidgetEntity> {
		return await this.save(widget);
	},

	async removeWidget(widget: DashboardWidgetEntity): Promise<DashboardWidgetEntity> {
		return await this.remove(widget);
	},
};
