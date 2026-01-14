import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { DeleteDashboardWidgetDs } from '../data-structures/delete-dashboard-widget.ds.js';
import { FoundDashboardWidgetDto } from '../dto/found-dashboard-widget.dto.js';
import { buildFoundDashboardWidgetDto } from '../utils/build-found-dashboard-widget-dto.util.js';
import { IDeleteDashboardWidget } from './dashboard-widget-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class DeleteDashboardWidgetUseCase
	extends AbstractUseCase<DeleteDashboardWidgetDs, FoundDashboardWidgetDto>
	implements IDeleteDashboardWidget
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	public async implementation(inputData: DeleteDashboardWidgetDs): Promise<FoundDashboardWidgetDto> {
		const { widgetId, dashboardId, connectionId, masterPassword } = inputData;

		const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPassword,
		);

		if (!foundConnection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		const foundDashboard = await this._dbContext.dashboardRepository.findDashboardByIdAndConnectionId(
			dashboardId,
			connectionId,
		);

		if (!foundDashboard) {
			throw new NotFoundException(Messages.DASHBOARD_NOT_FOUND);
		}

		const foundWidget = await this._dbContext.dashboardWidgetRepository.findWidgetByIdAndDashboardId(
			widgetId,
			dashboardId,
		);

		if (!foundWidget) {
			throw new NotFoundException(Messages.DASHBOARD_WIDGET_NOT_FOUND);
		}

		const widgetDto = buildFoundDashboardWidgetDto(foundWidget);
		await this._dbContext.dashboardWidgetRepository.removeWidget(foundWidget);

		return widgetDto;
	}
}
