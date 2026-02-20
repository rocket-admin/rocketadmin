import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
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
	) {
		super();
	}

	public async implementation(inputData: FindAllPanelsDs): Promise<FoundPanelDto[]> {
		const { connectionId, masterPassword } = inputData;

		const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPassword,
		);

		if (!foundConnection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		const foundQueries = await this._dbContext.panelRepository.findAllQueriesByConnectionId(connectionId);

		return foundQueries.map((query) => buildFoundPanelDto(query));
	}
}
