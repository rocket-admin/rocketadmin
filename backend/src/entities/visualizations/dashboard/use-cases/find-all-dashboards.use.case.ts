import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { FindAllDashboardsDs } from '../data-structures/find-all-dashboards.ds.js';
import { FoundDashboardDto } from '../dto/found-dashboard.dto.js';
import { buildFoundDashboardDto } from '../utils/build-found-dashboard-dto.util.js';
import { IFindAllDashboards } from './dashboard-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class FindAllDashboardsUseCase
	extends AbstractUseCase<FindAllDashboardsDs, FoundDashboardDto[]>
	implements IFindAllDashboards
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	public async implementation(inputData: FindAllDashboardsDs): Promise<FoundDashboardDto[]> {
		const { connectionId, masterPassword } = inputData;

		const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPassword,
		);

		if (!foundConnection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		const dashboards = await this._dbContext.dashboardRepository.findAllDashboardsByConnectionId(connectionId);

		return dashboards.map(buildFoundDashboardDto);
	}
}
