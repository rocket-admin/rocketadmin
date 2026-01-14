import { InTransactionEnum } from '../../../../enums/in-transaction.enum.js';
import { CreateDashboardDs } from '../data-structures/create-dashboard.ds.js';
import { UpdateDashboardDs } from '../data-structures/update-dashboard.ds.js';
import { FindDashboardDs } from '../data-structures/find-dashboard.ds.js';
import { FindAllDashboardsDs } from '../data-structures/find-all-dashboards.ds.js';
import { CreateDashboardWidgetDs } from '../data-structures/create-dashboard-widget.ds.js';
import { UpdateDashboardWidgetDs } from '../data-structures/update-dashboard-widget.ds.js';
import { DeleteDashboardWidgetDs } from '../data-structures/delete-dashboard-widget.ds.js';
import { FoundDashboardDto } from '../dto/found-dashboard.dto.js';
import { FoundDashboardWidgetDto } from '../dto/found-dashboard-widget.dto.js';

export interface ICreateDashboard {
	execute(inputData: CreateDashboardDs, inTransaction: InTransactionEnum): Promise<FoundDashboardDto>;
}

export interface IUpdateDashboard {
	execute(inputData: UpdateDashboardDs, inTransaction: InTransactionEnum): Promise<FoundDashboardDto>;
}

export interface IFindDashboard {
	execute(inputData: FindDashboardDs, inTransaction: InTransactionEnum): Promise<FoundDashboardDto>;
}

export interface IFindAllDashboards {
	execute(inputData: FindAllDashboardsDs, inTransaction: InTransactionEnum): Promise<FoundDashboardDto[]>;
}

export interface IDeleteDashboard {
	execute(inputData: FindDashboardDs, inTransaction: InTransactionEnum): Promise<FoundDashboardDto>;
}

export interface ICreateDashboardWidget {
	execute(inputData: CreateDashboardWidgetDs, inTransaction: InTransactionEnum): Promise<FoundDashboardWidgetDto>;
}

export interface IUpdateDashboardWidget {
	execute(inputData: UpdateDashboardWidgetDs, inTransaction: InTransactionEnum): Promise<FoundDashboardWidgetDto>;
}

export interface IDeleteDashboardWidget {
	execute(inputData: DeleteDashboardWidgetDs, inTransaction: InTransactionEnum): Promise<FoundDashboardWidgetDto>;
}
