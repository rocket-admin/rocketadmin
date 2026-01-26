import { SavedDbQueryEntity } from '../saved-db-query.entity.js';
import { FoundSavedDbQueryDto } from '../dto/found-saved-db-query.dto.js';

export function buildFoundSavedDbQueryDto(entity: SavedDbQueryEntity): FoundSavedDbQueryDto {
	return {
		id: entity.id,
		name: entity.name,
		description: entity.description,
		query_text: entity.query_text,
		connection_id: entity.connection_id,
		created_at: entity.created_at,
		updated_at: entity.updated_at,
	};
}
