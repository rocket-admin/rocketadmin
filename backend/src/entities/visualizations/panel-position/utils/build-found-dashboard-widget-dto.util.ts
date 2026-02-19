import { PanelPositionEntity } from '../panel-position.entity.js';
import { FoundPanelPositionDto } from '../dto/found-panel-position.dto.js';

export function buildFoundPanelPositionDto(panelPosition: PanelPositionEntity): FoundPanelPositionDto {
	return {
		id: panelPosition.id,
		position_x: panelPosition.position_x,
		position_y: panelPosition.position_y,
		width: panelPosition.width,
		height: panelPosition.height,
		dashboard_id: panelPosition.dashboard_id,
		query_id: panelPosition.query_id,
	};
}
