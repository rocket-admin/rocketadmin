import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { FindSavedDbQueryDs } from '../data-structures/find-panel.ds.js';
import { FoundPanelDto } from '../dto/found-saved-db-query.dto.js';
import { buildFoundPanelDto } from '../utils/build-found-panel-dto.util.js';
import { IDeletePanel } from './panel-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class DeleteSavedDbQueryUseCase
	extends AbstractUseCase<FindSavedDbQueryDs, FoundPanelDto>
	implements IDeletePanel
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	public async implementation(inputData: FindSavedDbQueryDs): Promise<FoundPanelDto> {
		const { queryId, connectionId, masterPassword } = inputData;

		const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPassword,
		);

		if (!foundConnection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		const foundQuery = await this._dbContext.panelRepository.findQueryByIdAndConnectionId(queryId, connectionId);

		if (!foundQuery) {
			throw new NotFoundException(Messages.SAVED_QUERY_NOT_FOUND);
		}

		const deletedQueryDto = buildFoundPanelDto(foundQuery);
		await this._dbContext.panelRepository.remove(foundQuery);
		return deletedQueryDto;
	}
}
