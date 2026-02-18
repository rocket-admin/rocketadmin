import { FoundPanelDto } from '../dto/found-saved-db-query.dto.js';
import { PanelEntity } from '../panel.entity.js';

export function buildFoundPanelDto(panel: PanelEntity): FoundPanelDto {
	return {
		id: panel.id,
		name: panel.name,
		description: panel.description,
		widget_type: panel.panel_type,
		chart_type: panel.chart_type,
		widget_options: panel.panel_options as unknown as Record<string, unknown> | null,
		query_text: panel.query_text,
		connection_id: panel.connection_id,
		created_at: panel.created_at,
		updated_at: panel.updated_at,
	};
}
