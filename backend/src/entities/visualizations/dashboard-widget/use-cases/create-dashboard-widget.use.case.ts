import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { DashboardWidgetEntity } from '../dashboard-widget.entity.js';
import { CreateDashboardWidgetDs } from '../data-structures/create-dashboard-widget.ds.js';
import { FoundDashboardWidgetDto } from '../dto/found-dashboard-widget.dto.js';
import { buildFoundDashboardWidgetDto } from '../utils/build-found-dashboard-widget-dto.util.js';
import { ICreateDashboardWidget } from './dashboard-widget-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class CreateDashboardWidgetUseCase
	extends AbstractUseCase<CreateDashboardWidgetDs, FoundDashboardWidgetDto>
	implements ICreateDashboardWidget
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	public async implementation(inputData: CreateDashboardWidgetDs): Promise<FoundDashboardWidgetDto> {
		const { dashboardId, connectionId, masterPassword, query_id, position_x, position_y, width, height } = inputData;

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

		// Validate query_id if provided
		if (query_id) {
			const foundQuery = await this._dbContext.savedDbQueryRepository.findQueryByIdAndConnectionId(
				query_id,
				connectionId,
			);
			if (!foundQuery) {
				throw new BadRequestException(Messages.SAVED_QUERY_NOT_FOUND);
			}
		}

		const newWidget = new DashboardWidgetEntity();
		newWidget.position_x = position_x ?? 0;
		newWidget.position_y = position_y ?? 0;
		newWidget.width = width ?? 4;
		newWidget.height = height ?? 3;
		newWidget.dashboard_id = dashboardId;
		newWidget.query_id = query_id || null;

		const savedWidget = await this._dbContext.dashboardWidgetRepository.saveWidget(newWidget);
		return buildFoundDashboardWidgetDto(savedWidget);
	}
}
