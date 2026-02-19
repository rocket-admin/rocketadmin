import { PanelPositionEntity } from '../panel-position.entity.js';
import { IPanelPositionRepository } from './panel-position.repository.interface.js';

export const panelPositionCustomRepositoryExtension: IPanelPositionRepository = {
	async findPanelPositionById(panelId: string): Promise<PanelPositionEntity | null> {
		return await this.findOne({ where: { id: panelId } });
	},

	async findPanelPositionByIdAndDashboardId(panelId: string, dashboardId: string): Promise<PanelPositionEntity | null> {
		return await this.findOne({
			where: { id: panelId, dashboard_id: dashboardId },
		});
	},

	async findAllPanelPositionsByDashboardId(dashboardId: string): Promise<PanelPositionEntity[]> {
		return await this.find({
			where: { dashboard_id: dashboardId },
			order: { position_y: 'ASC', position_x: 'ASC' },
		});
	},

	async savePanelPosition(panelPosition: PanelPositionEntity): Promise<PanelPositionEntity> {
		return await this.save(panelPosition);
	},

	async removePanelPosition(panelPosition: PanelPositionEntity): Promise<PanelPositionEntity> {
		return await this.remove(panelPosition);
	},
};
