import { InTransactionEnum } from '../../../../enums/in-transaction.enum.js';
import { CreateDashboardWidgetDs } from '../data-structures/create-dashboard-widget.ds.js';
import { UpdateDashboardWidgetDs } from '../data-structures/update-dashboard-widget.ds.js';
import { DeleteDashboardWidgetDs } from '../data-structures/delete-dashboard-widget.ds.js';
import { FoundDashboardWidgetDto } from '../dto/found-dashboard-widget.dto.js';

export interface ICreateDashboardWidget {
	execute(inputData: CreateDashboardWidgetDs, inTransaction: InTransactionEnum): Promise<FoundDashboardWidgetDto>;
}

export interface IUpdateDashboardWidget {
	execute(inputData: UpdateDashboardWidgetDs, inTransaction: InTransactionEnum): Promise<FoundDashboardWidgetDto>;
}

export interface IDeleteDashboardWidget {
	execute(inputData: DeleteDashboardWidgetDs, inTransaction: InTransactionEnum): Promise<FoundDashboardWidgetDto>;
}
