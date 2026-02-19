import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { DeletePanelPositionDs } from '../data-structures/delete-panel-position.ds.js';
import { FoundPanelPositionDto } from '../dto/found-panel-position.dto.js';
import { buildFoundPanelPositionDto } from '../utils/build-found-dashboard-widget-dto.util.js';
import { IDeletePanelPosition } from './panel-position-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class DeletePanelPositionUseCase
	extends AbstractUseCase<DeletePanelPositionDs, FoundPanelPositionDto>
	implements IDeletePanelPosition
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	public async implementation(inputData: DeletePanelPositionDs): Promise<FoundPanelPositionDto> {
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

		const foundWidget = await this._dbContext.panelPositionRepository.findPanelPositionByIdAndDashboardId(
			widgetId,
			dashboardId,
		);

		if (!foundWidget) {
			throw new NotFoundException(Messages.DASHBOARD_WIDGET_NOT_FOUND);
		}

		const widgetDto = buildFoundPanelPositionDto(foundWidget);
		await this._dbContext.panelPositionRepository.removePanelPosition(foundWidget);

		return widgetDto;
	}
}
