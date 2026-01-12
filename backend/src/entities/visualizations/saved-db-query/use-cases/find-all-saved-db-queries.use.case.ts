import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { FindAllSavedDbQueriesDs } from '../data-structures/find-all-saved-db-queries.ds.js';
import { FoundSavedDbQueryDto } from '../dto/found-saved-db-query.dto.js';
import { buildFoundSavedDbQueryDto } from '../utils/build-found-saved-db-query-dto.util.js';
import { IFindAllSavedDbQueries } from './saved-db-query-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class FindAllSavedDbQueriesUseCase
	extends AbstractUseCase<FindAllSavedDbQueriesDs, FoundSavedDbQueryDto[]>
	implements IFindAllSavedDbQueries
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	public async implementation(inputData: FindAllSavedDbQueriesDs): Promise<FoundSavedDbQueryDto[]> {
		const { connectionId, masterPassword } = inputData;

		const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPassword,
		);

		if (!foundConnection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		const foundQueries = await this._dbContext.savedDbQueryRepository.findAllQueriesByConnectionId(connectionId);

		return foundQueries.map((query) => buildFoundSavedDbQueryDto(query));
	}
}
