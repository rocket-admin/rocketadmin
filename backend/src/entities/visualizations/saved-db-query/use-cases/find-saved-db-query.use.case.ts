import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { FindSavedDbQueryDs } from '../data-structures/find-saved-db-query.ds.js';
import { FoundSavedDbQueryDto } from '../dto/found-saved-db-query.dto.js';
import { buildFoundSavedDbQueryDto } from '../utils/build-found-saved-db-query-dto.util.js';
import { IFindSavedDbQuery } from './saved-db-query-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class FindSavedDbQueryUseCase
	extends AbstractUseCase<FindSavedDbQueryDs, FoundSavedDbQueryDto>
	implements IFindSavedDbQuery
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	public async implementation(inputData: FindSavedDbQueryDs): Promise<FoundSavedDbQueryDto> {
		const { queryId, connectionId, masterPassword } = inputData;

		const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPassword,
		);

		if (!foundConnection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		const foundQuery = await this._dbContext.savedDbQueryRepository.findQueryByIdAndConnectionId(queryId, connectionId);

		if (!foundQuery) {
			throw new NotFoundException(Messages.SAVED_QUERY_NOT_FOUND);
		}

		return buildFoundSavedDbQueryDto(foundQuery);
	}
}
