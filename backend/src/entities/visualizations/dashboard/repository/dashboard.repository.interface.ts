import { DashboardEntity } from '../dashboard.entity.js';

export interface IDashboardRepository {
	findDashboardById(dashboardId: string): Promise<DashboardEntity | null>;
	findDashboardByIdAndConnectionId(dashboardId: string, connectionId: string): Promise<DashboardEntity | null>;
	findDashboardWithWidgets(dashboardId: string): Promise<DashboardEntity | null>;
	findAllDashboardsByConnectionId(connectionId: string): Promise<DashboardEntity[]>;
	saveDashboard(dashboard: DashboardEntity): Promise<DashboardEntity>;
	removeDashboard(dashboard: DashboardEntity): Promise<DashboardEntity>;
}
