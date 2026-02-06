import { DashboardEntity } from '../dashboard.entity.js';
import { IDashboardRepository } from './dashboard.repository.interface.js';

export const dashboardCustomRepositoryExtension: IDashboardRepository = {
	async findDashboardById(dashboardId: string): Promise<DashboardEntity | null> {
		return await this.findOne({ where: { id: dashboardId } });
	},

	async findDashboardByIdAndConnectionId(dashboardId: string, connectionId: string): Promise<DashboardEntity | null> {
		return await this.findOne({
			where: { id: dashboardId, connection_id: connectionId },
		});
	},

	async findDashboardWithWidgets(dashboardId: string): Promise<DashboardEntity | null> {
		const qb = this.createQueryBuilder('dashboard')
			.leftJoinAndSelect('dashboard.widgets', 'widgets')
			.where('dashboard.id = :dashboardId', { dashboardId });
		return await qb.getOne();
	},

	async findAllDashboardsByConnectionId(connectionId: string): Promise<DashboardEntity[]> {
		const qb = this.createQueryBuilder('dashboard')
			.leftJoinAndSelect('dashboard.widgets', 'widgets')
			.where('dashboard.connection_id = :connectionId', { connectionId })
			.orderBy('dashboard.created_at', 'DESC');
		return await qb.getMany();
	},

	async findAllDashboardsWithWidgetsByConnectionId(connectionId: string): Promise<DashboardEntity[]> {
		const qb = this.createQueryBuilder('dashboard')
			.leftJoinAndSelect('dashboard.widgets', 'widgets')
			.where('dashboard.connection_id = :connectionId', { connectionId })
			.orderBy('dashboard.created_at', 'DESC');
		return await qb.getMany();
	},

	async saveDashboard(dashboard: DashboardEntity): Promise<DashboardEntity> {
		return await this.save(dashboard);
	},

	async removeDashboard(dashboard: DashboardEntity): Promise<DashboardEntity> {
		return await this.remove(dashboard);
	},
};
