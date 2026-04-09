import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { CedarAction } from '../../../cedar-authorization/cedar-action-map.js';
import { CedarAuthorizationService } from '../../../cedar-authorization/cedar-authorization.service.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { FindAllPanelsDs } from '../data-structures/find-all-panels.ds.js';
import { FoundPanelDto } from '../dto/found-saved-db-query.dto.js';
import { buildFoundPanelDto } from '../utils/build-found-panel-dto.util.js';
import { IFindAllPanels } from './panel-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class FindAllSavedDbQueriesUseCase
	extends AbstractUseCase<FindAllPanelsDs, FoundPanelDto[]>
	implements IFindAllPanels
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly cedarAuthService: CedarAuthorizationService,
	) {
		super();
	}

	public async implementation(inputData: FindAllPanelsDs): Promise<FoundPanelDto[]> {
		const { connectionId, masterPassword, userId } = inputData;

		const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPassword,
		);

		if (!foundConnection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		const foundQueries = await this._dbContext.panelRepository.findAllQueriesByConnectionId(connectionId);

		const accessChecks = await Promise.all(
			foundQueries.map((query) =>
				this.cedarAuthService.validate({
					userId,
					action: CedarAction.PanelRead,
					connectionId,
					panelId: query.id,
				}),
			),
		);

		return foundQueries.filter((_, index) => accessChecks[index]).map((query) => buildFoundPanelDto(query));
	}
}
