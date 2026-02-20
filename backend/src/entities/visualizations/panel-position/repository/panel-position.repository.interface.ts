import { PanelPositionEntity } from '../panel-position.entity.js';

export interface IPanelPositionRepository {
	findPanelPositionById(panelId: string): Promise<PanelPositionEntity | null>;
	findPanelPositionByIdAndDashboardId(panelId: string, dashboardId: string): Promise<PanelPositionEntity | null>;
	findAllPanelPositionsByDashboardId(dashboardId: string): Promise<PanelPositionEntity[]>;
	savePanelPosition(panel: PanelPositionEntity): Promise<PanelPositionEntity>;
	removePanelPosition(panel: PanelPositionEntity): Promise<PanelPositionEntity>;
}
