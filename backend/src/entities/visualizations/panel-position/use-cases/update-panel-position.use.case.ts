import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { UpdatePanelPositionDs } from '../data-structures/update-panel-position.ds.js';
import { FoundPanelPositionDto } from '../dto/found-panel-position.dto.js';
import { buildFoundPanelPositionDto } from '../utils/build-found-dashboard-widget-dto.util.js';
import { IUpdatePanelPosition } from './panel-position-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class UpdateDashboardWidgetUseCase
	extends AbstractUseCase<UpdatePanelPositionDs, FoundPanelPositionDto>
	implements IUpdatePanelPosition
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	public async implementation(inputData: UpdatePanelPositionDs): Promise<FoundPanelPositionDto> {
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

		const foundWidget = await this._dbContext.panelPositionRepository.findPanelPositionByIdAndDashboardId(
			widgetId,
			dashboardId,
		);

		if (!foundWidget) {
			throw new NotFoundException(Messages.DASHBOARD_WIDGET_NOT_FOUND);
		}

		// Validate query_id if provided
		if (query_id !== undefined && query_id !== null) {
			const foundQuery = await this._dbContext.panelRepository.findQueryByIdAndConnectionId(query_id, connectionId);
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

		const savedWidget = await this._dbContext.panelPositionRepository.savePanelPosition(foundWidget);
		return buildFoundPanelPositionDto(savedWidget);
	}
}
