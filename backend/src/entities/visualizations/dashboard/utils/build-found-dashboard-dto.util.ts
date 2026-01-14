import { DashboardEntity } from '../dashboard.entity.js';
import { FoundDashboardDto } from '../dto/found-dashboard.dto.js';
import { buildFoundDashboardWidgetDto } from './build-found-dashboard-widget-dto.util.js';

export function buildFoundDashboardDto(dashboard: DashboardEntity): FoundDashboardDto {
	return {
		id: dashboard.id,
		name: dashboard.name,
		description: dashboard.description,
		connection_id: dashboard.connection_id,
		created_at: dashboard.created_at,
		updated_at: dashboard.updated_at,
		widgets: dashboard.widgets?.map(buildFoundDashboardWidgetDto),
	};
}
