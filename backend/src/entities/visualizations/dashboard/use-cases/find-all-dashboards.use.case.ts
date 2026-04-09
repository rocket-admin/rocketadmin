import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { CedarAction } from '../../../cedar-authorization/cedar-action-map.js';
import { CedarAuthorizationService } from '../../../cedar-authorization/cedar-authorization.service.js';
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
		private readonly cedarAuthService: CedarAuthorizationService,
	) {
		super();
	}

	public async implementation(inputData: FindAllDashboardsDs): Promise<FoundDashboardDto[]> {
		const { connectionId, masterPassword, userId } = inputData;

		const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPassword,
		);

		if (!foundConnection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		const dashboards =
			await this._dbContext.dashboardRepository.findAllDashboardsWithWidgetsByConnectionId(connectionId);

		const accessChecks = await Promise.all(
			dashboards.map((dashboard) =>
				this.cedarAuthService.validate({
					userId,
					action: CedarAction.DashboardRead,
					connectionId,
					dashboardId: dashboard.id,
				}),
			),
		);

		return dashboards.filter((_, index) => accessChecks[index]).map(buildFoundDashboardDto);
	}
}
