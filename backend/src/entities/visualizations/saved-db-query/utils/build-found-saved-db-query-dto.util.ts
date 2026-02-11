import { FoundSavedDbQueryDto } from '../dto/found-saved-db-query.dto.js';
import { SavedDbQueryEntity } from '../saved-db-query.entity.js';

export function buildFoundSavedDbQueryDto(entity: SavedDbQueryEntity): FoundSavedDbQueryDto {
	return {
		id: entity.id,
		name: entity.name,
		description: entity.description,
		widget_type: entity.widget_type,
		chart_type: entity.chart_type,
		widget_options: entity.widget_options as unknown as Record<string, unknown> | null,
		query_text: entity.query_text,
		connection_id: entity.connection_id,
		created_at: entity.created_at,
		updated_at: entity.updated_at,
	};
}
