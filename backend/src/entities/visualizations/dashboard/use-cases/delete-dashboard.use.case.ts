import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { FindDashboardDs } from '../data-structures/find-dashboard.ds.js';
import { FoundDashboardDto } from '../dto/found-dashboard.dto.js';
import { buildFoundDashboardDto } from '../utils/build-found-dashboard-dto.util.js';
import { IDeleteDashboard } from './dashboard-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class DeleteDashboardUseCase
	extends AbstractUseCase<FindDashboardDs, FoundDashboardDto>
	implements IDeleteDashboard
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	public async implementation(inputData: FindDashboardDs): Promise<FoundDashboardDto> {
		const { dashboardId, connectionId, masterPassword } = inputData;

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

		const dashboardDto = buildFoundDashboardDto(foundDashboard);
		await this._dbContext.dashboardRepository.removeDashboard(foundDashboard);

		return dashboardDto;
	}
}
