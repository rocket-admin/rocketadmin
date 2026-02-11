import { InTransactionEnum } from '../../../../enums/in-transaction.enum.js';
import { CreateDashboardDs } from '../data-structures/create-dashboard.ds.js';
import { FindAllDashboardsDs } from '../data-structures/find-all-dashboards.ds.js';
import { FindDashboardDs } from '../data-structures/find-dashboard.ds.js';
import { UpdateDashboardDs } from '../data-structures/update-dashboard.ds.js';
import { FoundDashboardDto } from '../dto/found-dashboard.dto.js';

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
