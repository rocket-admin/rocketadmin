import { DashboardWidgetEntity } from '../dashboard-widget.entity.js';
import { FoundDashboardWidgetDto } from '../dto/found-dashboard-widget.dto.js';

export function buildFoundDashboardWidgetDto(widget: DashboardWidgetEntity): FoundDashboardWidgetDto {
	return {
		id: widget.id,
		position_x: widget.position_x,
		position_y: widget.position_y,
		width: widget.width,
		height: widget.height,
		dashboard_id: widget.dashboard_id,
		query_id: widget.query_id,
	};
}
