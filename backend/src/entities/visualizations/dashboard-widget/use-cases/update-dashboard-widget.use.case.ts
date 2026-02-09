import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { UpdateDashboardWidgetDs } from '../data-structures/update-dashboard-widget.ds.js';
import { FoundDashboardWidgetDto } from '../dto/found-dashboard-widget.dto.js';
import { buildFoundDashboardWidgetDto } from '../utils/build-found-dashboard-widget-dto.util.js';
import { IUpdateDashboardWidget } from './dashboard-widget-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class UpdateDashboardWidgetUseCase
	extends AbstractUseCase<UpdateDashboardWidgetDs, FoundDashboardWidgetDto>
	implements IUpdateDashboardWidget
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	public async implementation(inputData: UpdateDashboardWidgetDs): Promise<FoundDashboardWidgetDto> {
		const { widgetId, dashboardId, connectionId, masterPassword, query_id, position_x, position_y, width, height } =
			inputData;

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

		// Validate query_id if provided
		if (query_id !== undefined && query_id !== null) {
			const foundQuery = await this._dbContext.savedDbQueryRepository.findQueryByIdAndConnectionId(
				query_id,
				connectionId,
			);
			if (!foundQuery) {
				throw new BadRequestException(Messages.SAVED_QUERY_NOT_FOUND);
			}
			foundWidget.query_id = query_id;
		}

		if (position_x !== undefined) {
			foundWidget.position_x = position_x;
		}
		if (position_y !== undefined) {
			foundWidget.position_y = position_y;
		}
		if (width !== undefined) {
			foundWidget.width = width;
		}
		if (height !== undefined) {
			foundWidget.height = height;
		}

		const savedWidget = await this._dbContext.dashboardWidgetRepository.saveWidget(foundWidget);
		return buildFoundDashboardWidgetDto(savedWidget);
	}
}
