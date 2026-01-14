import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { UpdateDashboardDs } from '../data-structures/update-dashboard.ds.js';
import { FoundDashboardDto } from '../dto/found-dashboard.dto.js';
import { buildFoundDashboardDto } from '../utils/build-found-dashboard-dto.util.js';
import { IUpdateDashboard } from './dashboard-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class UpdateDashboardUseCase
	extends AbstractUseCase<UpdateDashboardDs, FoundDashboardDto>
	implements IUpdateDashboard
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	public async implementation(inputData: UpdateDashboardDs): Promise<FoundDashboardDto> {
		const { dashboardId, connectionId, masterPassword, name, description } = inputData;

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

		if (name !== undefined) {
			foundDashboard.name = name;
		}
		if (description !== undefined) {
			foundDashboard.description = description;
		}
		foundDashboard.updated_at = new Date();

		const savedDashboard = await this._dbContext.dashboardRepository.saveDashboard(foundDashboard);
		return buildFoundDashboardDto(savedDashboard);
	}
}
