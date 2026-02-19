import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { PanelPositionEntity } from '../panel-position.entity.js';
import { CreatePanelPositionDs } from '../data-structures/create-panel-position.ds.js';
import { FoundPanelPositionDto } from '../dto/found-panel-position.dto.js';
import { buildFoundPanelPositionDto } from '../utils/build-found-dashboard-widget-dto.util.js';
import { ICreatePanelPositionWidget } from './panel-position-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class CreatePanelPositionUseCase
	extends AbstractUseCase<CreatePanelPositionDs, FoundPanelPositionDto>
	implements ICreatePanelPositionWidget
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	public async implementation(inputData: CreatePanelPositionDs): Promise<FoundPanelPositionDto> {
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

		if (query_id) {
			const foundQuery = await this._dbContext.panelRepository.findQueryByIdAndConnectionId(query_id, connectionId);
			if (!foundQuery) {
				throw new BadRequestException(Messages.SAVED_QUERY_NOT_FOUND);
			}
		}

		const newPanelPosition = new PanelPositionEntity();
		newPanelPosition.position_x = position_x ?? 0;
		newPanelPosition.position_y = position_y ?? 0;
		newPanelPosition.width = width ?? 4;
		newPanelPosition.height = height ?? 3;
		newPanelPosition.dashboard_id = dashboardId;
		newPanelPosition.query_id = query_id || null;

		const savedWidget = await this._dbContext.panelPositionRepository.savePanelPosition(newPanelPosition);
		return buildFoundPanelPositionDto(savedWidget);
	}
}
