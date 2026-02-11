import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { DashboardEntity } from '../dashboard.entity.js';
import { CreateDashboardDs } from '../data-structures/create-dashboard.ds.js';
import { FoundDashboardDto } from '../dto/found-dashboard.dto.js';
import { buildFoundDashboardDto } from '../utils/build-found-dashboard-dto.util.js';
import { ICreateDashboard } from './dashboard-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class CreateDashboardUseCase
	extends AbstractUseCase<CreateDashboardDs, FoundDashboardDto>
	implements ICreateDashboard
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	public async implementation(inputData: CreateDashboardDs): Promise<FoundDashboardDto> {
		const { connectionId, masterPassword, name, description } = inputData;

		const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPassword,
		);

		if (!foundConnection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		const newDashboard = new DashboardEntity();
		newDashboard.name = name;
		newDashboard.description = description || null;
		newDashboard.connection_id = foundConnection.id;

		const savedDashboard = await this._dbContext.dashboardRepository.saveDashboard(newDashboard);
		return buildFoundDashboardDto(savedDashboard);
	}
}
