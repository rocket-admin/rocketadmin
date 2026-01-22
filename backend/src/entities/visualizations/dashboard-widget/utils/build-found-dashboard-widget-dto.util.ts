import { DashboardWidgetEntity } from '../dashboard-widget.entity.js';
import { FoundDashboardWidgetDto } from '../dto/found-dashboard-widget.dto.js';

export function buildFoundDashboardWidgetDto(widget: DashboardWidgetEntity): FoundDashboardWidgetDto {
	return {
		id: widget.id,
		widget_type: widget.widget_type,
		chart_type: widget.chart_type,
		name: widget.name,
		description: widget.description,
		position_x: widget.position_x,
		position_y: widget.position_y,
		width: widget.width,
		height: widget.height,
		widget_options: widget.widget_options as unknown as Record<string, unknown> | null,
		dashboard_id: widget.dashboard_id,
		query_id: widget.query_id,
	};
}
